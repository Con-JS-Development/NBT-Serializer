import {BinaryStreamReader,BinaryStreamWriter} from "./BinaryStream";
export const NBTTypes = {
    "EndOfCompoud":0,
    "Compoud":1,
    "Array":2,
    "TypedArray":3,
    "Uint8":4,
    "Uint16":5,
    "Int32":6,
    "Double":7,
    "String":8,
    "Empty":9,
    "Boolean":10,
    0:"EndOfCompoud",
    1:"Compoud",
    2:"Array",
    3:"TypedArray",
    4:"Uint8",
    5:"Uint16",
    6:"Int32",
    7:"Double",
    8:"String",
    9:"Empty",
    10:"Boolean"
}
function isUint8(n) {return Number.isInteger(n) && n >= 0 && n <= 255;}  
function isUint16(n) {return Number.isInteger(n) && n >= 0 && n <= 65535;}
function isInt32(n) {return Number.isInteger(n) && n >= -2147483648 && n <= 2147483647;}
const caller = Function.prototype.call;
export class NBTStreamWriter extends BinaryStreamWriter{
    /**@private */
    static __nbt_writers__ = {
        [NBTTypes.Compoud]:caller.bind(NBTStreamWriter.prototype.writeCompoud),
        [NBTTypes.Empty]:caller.bind(NBTStreamWriter.prototype.writeEmpty),
        [NBTTypes.Array]:caller.bind(NBTStreamWriter.prototype.writeArray),
        [NBTTypes.String]:caller.bind(NBTStreamWriter.prototype.writeString),
        [NBTTypes.Boolean]:caller.bind(NBTStreamWriter.prototype.writeBoolean),
        [NBTTypes.Uint8]:caller.bind(NBTStreamWriter.prototype.writeByte),
        [NBTTypes.Uint16]:caller.bind(NBTStreamWriter.prototype.writeUint16),
        [NBTTypes.Int32]:caller.bind(NBTStreamWriter.prototype.writeInt32),
        [NBTTypes.Double]:caller.bind(NBTStreamWriter.prototype.writeFloat64),
        [NBTTypes.TypedArray]:caller.bind(NBTStreamWriter.prototype.writeTypedArray)
    };
    writeTypedArray(array){
        const typeOf = NBT.getType(array[0]);
        let bytes = this.writeType(typeOf);
        bytes += this.writeUint16(array.length);
        for (const data of array) bytes+=NBTStreamWriter.__nbt_writers__[typeOf](this,data);
        return bytes;
    }
    writeBoolean(bool){return this.writeByte(!!bool?1:0);}
    writeString(text){
        return this.writeUint16(text.length) + super.writeString(text,8);
    }
    writeArray(array){
        let bytes = this.writeUint16(array.length);
        for (const data of array) {
            const type = NBT.getType(data);
            if(!type) continue;
            bytes += this.writeType(type) 
            + NBTStreamWriter.__nbt_writers__[type](this,data);
        }
        return bytes;
    }
    writeCompoud(object){
        let bytes = 0;
        for (const propertyName of Object.getOwnPropertyNames(object??{})) {
            const data = object[propertyName];
            const type = NBT.getType(data);
            if(!type) continue;
            bytes+=this.writeType(type) 
            + this.writeString(propertyName,8) 
            + NBTStreamWriter.__nbt_writers__[type](this,data);
        }
        bytes+=this.writeType(NBTTypes.EndOfCompoud);
        return bytes;
    }
    writeEmpty(){return 0;}
    writeType(type){return this.writeByte(typeof type==="string"?(NBTTypes[type]??0):type??0);}
}
export class NBTStreamReader extends BinaryStreamReader{
    /**@private */
    static __nbt_readers__ = {
        [NBTTypes.Compoud]:caller.bind(NBTStreamReader.prototype.readCompoud),
        [NBTTypes.Empty]:caller.bind(NBTStreamReader.prototype.readEmpty),
        [NBTTypes.Array]:caller.bind(NBTStreamReader.prototype.readArray),
        [NBTTypes.String]:caller.bind(NBTStreamReader.prototype.readString),
        [NBTTypes.Boolean]:caller.bind(NBTStreamReader.prototype.readBoolean),
        [NBTTypes.Uint8]:caller.bind(NBTStreamReader.prototype.readByte),
        [NBTTypes.Uint16]:caller.bind(NBTStreamReader.prototype.readUint16),
        [NBTTypes.Int32]:caller.bind(NBTStreamReader.prototype.readInt32),
        [NBTTypes.Double]:caller.bind(NBTStreamReader.prototype.readFloat64),
        [NBTTypes.TypedArray]:caller.bind(NBTStreamReader.prototype.readTypedArray)
    };
    readTypedArray(){
        const typeOf = this.readType(),array=[];
        let length = this.readUint16();
        for (let i = 0; i < length; i++) array.push(NBTStreamReader.__nbt_readers__[typeOf](this));
        return array;
    }
    readBoolean(){return !!this.readByte();}
    readString(){
        const length = this.readUint16();
        let text = super.readString(length,8);
        return text
    }
    readArray(){
        let length = this.readUint16();
        const array = [];
        for (let i = 0; i < length; i++) {
            const type = this.readType();
            array.push(NBTStreamReader.__nbt_readers__[type](this));
        }
        return array;
    }
    readCompoud(){
        const object = {};
        while(true){
            const dataType = this.readType();
            if(dataType === NBTTypes.EndOfCompoud) break;
            const propertyName = this.readString();
            const data = NBTStreamReader.__nbt_readers__[dataType](this);
            object[propertyName] = data;
        }
        return object;
    }
    readEmpty(){return undefined;}
    readType(){return this.readByte();}
}
export class NBT{
    static ReadNBT(stream){
        let type = stream.readType();
        return NBTStreamReader.__nbt_readers__[type](stream);
    }
    static WriteNBT(data, stream, type = NBT.getType(data)){
        let bytesWriten = stream.writeType(type);
        bytesWriten += NBTStreamWriter.__nbt_writers__[type](stream,data);
        return bytesWriten;
    }
    static getType(object){
        switch (typeof object) {
            case "undefined":
                return NBTTypes.Empty;
            case "string":
                return NBTTypes.String;
            case "boolean":
                return NBTTypes.Boolean;
            case "object": 
                return Array.isArray(object)?NBTTypes.Array:NBTTypes.Compoud;
            case "number":
                if(isUint8(object)) return NBTTypes.Uint8;
                if(isUint16(object)) return NBTTypes.Uint16;
                if(isInt32(object)) return NBTTypes.Int32;
                return NBTTypes.Double;
            default:
                return undefined;
        }
    }
    static stringify(object){
        let o = new NBTStreamWriter(32e+3);
        NBT.WriteNBT(object,o);
        return o.toString();
    }
    static parse(string){
        let stream = NBTStreamReader.fromString(string);
        return NBT.ReadNBT(stream);
    }
}