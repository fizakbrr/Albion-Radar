class Protocol18Reader {
	buffer: Buffer;
	offset: number;

	constructor(buffer) {
		this.buffer = Buffer.from(buffer);
		this.offset = 0;
	}

	remaining() {
		return this.buffer.length - this.offset;
	}

	readUInt8() {
		this.assertAvailable(1);
		return this.buffer[this.offset++];
	}

	readInt8() {
		this.assertAvailable(1);
		const value = this.buffer.readInt8(this.offset);
		this.offset += 1;
		return value;
	}

	readUInt16LE() {
		this.assertAvailable(2);
		const value = this.buffer.readUInt16LE(this.offset);
		this.offset += 2;
		return value;
	}

	readInt16LE() {
		this.assertAvailable(2);
		const value = this.buffer.readInt16LE(this.offset);
		this.offset += 2;
		return value;
	}

	readFloatLE() {
		this.assertAvailable(4);
		const value = this.buffer.readFloatLE(this.offset);
		this.offset += 4;
		return value;
	}

	readDoubleLE() {
		this.assertAvailable(8);
		const value = this.buffer.readDoubleLE(this.offset);
		this.offset += 8;
		return value;
	}

	readBytes(size) {
		this.assertAvailable(size);
		const value = this.buffer.slice(this.offset, this.offset + size);
		this.offset += size;
		return value;
	}

	readVarUInt32() {
		let result = 0;
		let shift = 0;

		while (true) {
			const byte = this.readUInt8();
			result += (byte & 0x7f) * (2 ** shift);

			if ((byte & 0x80) === 0) {
				return result >>> 0;
			}

			shift += 7;
			if (shift > 35) {
				throw new Error('Protocol18 varint32 is too large.');
			}
		}
	}

	readVarInt32() {
		const value = this.readVarUInt32();
		return (value >>> 1) ^ -(value & 1);
	}

	readVarInt64() {
		let result = 0n;
		let shift = 0n;

		while (true) {
			const byte = this.readUInt8();
			result |= BigInt(byte & 0x7f) << shift;

			if ((byte & 0x80) === 0) {
				const decoded = (result >> 1n) ^ -(result & 1n);
				return this.toSafeJsonNumber(decoded);
			}

			shift += 7n;
			if (shift > 70n) {
				throw new Error('Protocol18 varint64 is too large.');
			}
		}
	}

	toSafeJsonNumber(value) {
		if (value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)) {
			return Number(value);
		}

		return value;
	}

	assertAvailable(size) {
		if (size < 0 || this.remaining() < size) {
			throw new Error(`Protocol18 buffer underflow. Need ${size} byte(s), have ${this.remaining()}.`);
		}
	}
}

class Protocol18Deserializer {
	static messageType = {
		OperationRequest: 2,
		OtherOperationResponse: 3,
		EventData: 4,
		ExchangeKeys: 6,
		OperationResponse: 7,
	};

	static type = {
		Unknown: 0,
		Boolean: 2,
		Int8: 3,
		Int16: 4,
		Float32: 5,
		Float64: 6,
		String: 7,
		Nil: 8,
		CompressedInt32: 9,
		CompressedInt64: 10,
		Int8Positive: 11,
		Int8Negative: 12,
		Int16Positive: 13,
		Int16Negative: 14,
		Long8Positive: 15,
		Long8Negative: 16,
		Long16Positive: 17,
		Long16Negative: 18,
		Custom: 19,
		Dictionary: 20,
		Hashtable: 21,
		ObjectArray: 23,
		OperationRequest: 24,
		OperationResponse: 25,
		EventData: 26,
		BooleanFalse: 27,
		BooleanTrue: 28,
		ShortZero: 29,
		IntZero: 30,
		LongZero: 31,
		FloatZero: 32,
		DoubleZero: 33,
		ByteZero: 34,
		Array: 0x40,
		BooleanArray: 0x42,
		ByteArray: 0x43,
		ShortArray: 0x44,
		Float32Array: 0x45,
		Float64Array: 0x46,
		StringArray: 0x47,
		CompressedInt32Array: 0x49,
		CompressedInt64Array: 0x4a,
		CustomArray: 0x53,
		DictionaryArray: 0x54,
		HashtableArray: 0x55,
	};

	static looksLikeReliable(buffer) {
		return buffer && buffer.length >= 3 && buffer[0] === 0xf3;
	}

	static deserializeReliable(buffer) {
		const input = new Protocol18Reader(buffer);
		const signature = input.readUInt8();

		if (signature !== 0xf3) {
			throw new Error(`Protocol18 reliable signature ${signature} is not supported.`);
		}

		const messageType = input.readUInt8();
		let code;
		let returnCode;
		let debugMessage;

		switch (messageType) {
			case this.messageType.OperationRequest:
			case this.messageType.EventData:
				code = input.readUInt8();
				break;
			case this.messageType.OperationResponse:
			case this.messageType.OtherOperationResponse:
				code = input.readUInt8();
				returnCode = input.readInt16LE();
				debugMessage = this.deserialize(input, input.readUInt8());
				break;
			default:
				throw new Error(`Protocol18 message type ${messageType} is not supported.`);
		}

		const parameterCount = input.readVarUInt32();
		const parameters = {};

		for (let i = 0; i < parameterCount; i++) {
			const key = input.readUInt8();
			const typeCode = input.readUInt8();
			parameters[key] = this.deserialize(input, typeCode);
		}

		if (input.remaining() !== 0) {
			throw new Error(`Protocol18 reliable payload has ${input.remaining()} trailing byte(s).`);
		}

		if (messageType === this.messageType.EventData && parameters[252] === undefined) {
			parameters[252] = code;
		}

		this.applyAlbionCompatibilityFields(code, parameters);

		return {
			messageType,
			code,
			operationCode: code,
			returnCode,
			debugMessage,
			parameters,
		};
	}

	static deserialize(input, typeCode) {
		switch (typeCode) {
			case this.type.Unknown:
			case this.type.Nil:
				return null;
			case this.type.Boolean:
				return input.readUInt8() !== 0;
			case this.type.Int8:
				return input.readInt8();
			case this.type.Int8Positive:
				return input.readUInt8();
			case this.type.Int8Negative:
				return -input.readUInt8();
			case this.type.Int16:
				return input.readInt16LE();
			case this.type.Int16Positive:
				return input.readUInt16LE();
			case this.type.Int16Negative:
				return -input.readUInt16LE();
			case this.type.Long8Positive:
				return input.readUInt8();
			case this.type.Long8Negative:
				return -input.readUInt8();
			case this.type.Long16Positive:
				return input.readUInt16LE();
			case this.type.Long16Negative:
				return -input.readUInt16LE();
			case this.type.CompressedInt32:
				return input.readVarInt32();
			case this.type.CompressedInt64:
				return input.readVarInt64();
			case this.type.String:
				return input.readBytes(input.readVarUInt32()).toString('utf8');
			case this.type.Float32:
				return input.readFloatLE();
			case this.type.Float64:
				return input.readDoubleLE();
			case this.type.BooleanFalse:
				return false;
			case this.type.BooleanTrue:
				return true;
			case this.type.ShortZero:
			case this.type.IntZero:
			case this.type.LongZero:
			case this.type.FloatZero:
			case this.type.DoubleZero:
			case this.type.ByteZero:
				return 0;
			case this.type.ByteArray:
				return input.readBytes(input.readVarUInt32());
			case this.type.ShortArray:
				return this.deserializeArrayValues(input, () => input.readInt16LE());
			case this.type.Float32Array:
				return this.deserializeArrayValues(input, () => input.readFloatLE());
			case this.type.Float64Array:
				return this.deserializeArrayValues(input, () => input.readDoubleLE());
			case this.type.StringArray:
				return this.deserializeArrayValues(input, () => input.readBytes(input.readVarUInt32()).toString('utf8'));
			case this.type.CompressedInt32Array:
				return this.deserializeArrayValues(input, () => input.readVarInt32());
			case this.type.CompressedInt64Array:
				return this.deserializeArrayValues(input, () => input.readVarInt64());
			case this.type.BooleanArray:
				return this.deserializeBooleanArray(input);
			case this.type.Array:
			case this.type.ObjectArray:
				return this.deserializeObjectArray(input);
			case this.type.Dictionary:
				return this.deserializeDictionary(input);
			case this.type.Hashtable:
				return this.deserializeHashtable(input);
			case this.type.OperationRequest:
				return this.deserializeNestedOperationRequest(input);
			case this.type.OperationResponse:
				return this.deserializeNestedOperationResponse(input);
			case this.type.EventData:
				return this.deserializeNestedEventData(input);
			default:
				throw new Error(`Protocol18 type code ${typeCode} is not implemented.`);
		}
	}

	static deserializeArrayValues(input, readValue) {
		const count = input.readVarUInt32();
		const output = [];

		for (let i = 0; i < count; i++) {
			output.push(readValue());
		}

		return output;
	}

	static deserializeBooleanArray(input) {
		const count = input.readVarUInt32();
		const bytes = input.readBytes(Math.ceil(count / 8));
		const output = [];

		for (let i = 0; i < count; i++) {
			output.push((bytes[Math.floor(i / 8)] & (1 << (i % 8))) !== 0);
		}

		return output;
	}

	static deserializeObjectArray(input) {
		return this.deserializeArrayValues(input, () => this.deserialize(input, input.readUInt8()));
	}

	static deserializeDictionary(input) {
		const keyType = input.readUInt8();
		const valueType = input.readUInt8();
		const count = input.readVarUInt32();
		const output = {};

		for (let i = 0; i < count; i++) {
			const key = this.deserialize(input, keyType);
			output[key] = this.deserialize(input, valueType);
		}

		return output;
	}

	static deserializeHashtable(input) {
		const count = input.readVarUInt32();
		const output = {};

		for (let i = 0; i < count; i++) {
			const key = this.deserialize(input, input.readUInt8());
			output[key] = this.deserialize(input, input.readUInt8());
		}

		return output;
	}

	static deserializeNestedOperationRequest(input) {
		const operationCode = input.readUInt8();
		const parameters = this.deserializeParameterTable(input);
		return { operationCode, parameters };
	}

	static deserializeNestedOperationResponse(input) {
		const operationCode = input.readUInt8();
		const returnCode = input.readInt16LE();
		const debugMessage = this.deserialize(input, input.readUInt8());
		const parameters = this.deserializeParameterTable(input);
		return { operationCode, returnCode, debugMessage, parameters };
	}

	static deserializeNestedEventData(input) {
		const code = input.readUInt8();
		const parameters = this.deserializeParameterTable(input);

		if (parameters[252] === undefined) {
			parameters[252] = code;
		}

		this.applyAlbionCompatibilityFields(code, parameters);
		return { code, parameters };
	}

	static deserializeParameterTable(input) {
		const count = input.readVarUInt32();
		const parameters = {};

		for (let i = 0; i < count; i++) {
			const key = input.readUInt8();
			const typeCode = input.readUInt8();
			parameters[key] = this.deserialize(input, typeCode);
		}

		return parameters;
	}

	static applyAlbionCompatibilityFields(code, parameters) {
		if (code !== 3 || !Buffer.isBuffer(parameters[1]) || parameters[1].length < 17) {
			return;
		}

		parameters[4] = parameters[1].readFloatLE(9);
		parameters[5] = parameters[1].readFloatLE(13);
	}
}

module.exports = Protocol18Deserializer;

export {};
