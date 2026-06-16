const BufferCursor = require('buffercursor');

const Protocol16Deserializer = require('./Protocol16Deserializer');
const Protocol18Deserializer = require('./Protocol18Deserializer');

class PhotonCommand {
	[key: string]: any;

	constructor(parent, payload) {
		this.parent = parent;
		this.payload = payload;
		this.commandType = 0;
		this.channelId = 0;
		this.commandFlags = 0;
		this.commandLength = 0;
		this.sequenceNumber = 0;
		this.messageType = 0;
		this.data = {};

		this.parseCommand();
	}

	/**
	 * Parse the command header.
	 */
	parseCommandHeader() {
		if (this.payload.length - this.payload.tell() < 12) {
			throw new Error('Photon command header is truncated.');
		}

		this.commandType = this.payload.readUInt8();
		this.channelId = this.payload.readUInt8();
		this.commandFlags = this.payload.readUInt8();
		this.payload.seek(this.payload.tell() + 1);
		this.commandLength = this.payload.readUInt32BE();
		this.sequenceNumber = this.payload.readUInt32BE();

		if (this.commandLength < 12) {
			throw new Error(`Photon command length ${this.commandLength} is smaller than the header.`);
		}

		if (this.commandLength - 12 > this.payload.length - this.payload.tell()) {
			throw new Error(`Photon command length ${this.commandLength} exceeds remaining packet bytes.`);
		}

		this.payload = this.payload.slice(this.commandLength - 12);
	}

	parseCommand() {
		this.parseCommandHeader();

		switch (this.commandType) {
			case 7:
				if (this.payload.length - this.payload.tell() < 4) {
					throw new Error('Photon unreliable command is truncated.');
				}

				this.payload.seek(this.payload.tell() + 4);
				this.payload = this.payload.slice(this.payload.length - this.payload.tell());
				this.parseReliableCommand();
				break;
			case 6:
				this.parseReliableCommand();
				break;
			case 8:
				this.parseReliableFragmentCommand();
				break;
			case 4:
				break;
		}
	}

	parseReliableCommand() {
		this.parseReliableBuffer(this.payload.buffer.slice(this.payload.tell()));
	}

	parseReliableBuffer(buffer) {
		if (this.tryParseProtocol18(buffer)) {
			return;
		}

		this.parseProtocol16(buffer);
	}

	tryParseProtocol18(buffer) {
		if (!Protocol18Deserializer.looksLikeReliable(buffer)) {
			return false;
		}

		try {
			this.data = Protocol18Deserializer.deserializeReliable(buffer);
			this.messageType = this.data.messageType;
		} catch {
			return false;
		}

		switch (this.messageType) {
			case Protocol18Deserializer.messageType.OperationRequest:
				this.parent.parent.emit('request', this.data);
				break;
			case Protocol18Deserializer.messageType.OperationResponse:
			case Protocol18Deserializer.messageType.OtherOperationResponse:
				this.parent.parent.emit('response', this.data);
				break;
			case Protocol18Deserializer.messageType.EventData:
				this.parent.parent.emit('event', this.data);
				break;
		}

		return true;
	}

	parseProtocol16(buffer) {
		if (!buffer || buffer.length < 2) {
			return;
		}

		const payload = new BufferCursor(buffer);

		payload.seek(payload.tell() + 1);
		this.messageType = payload.readUInt8();
		const dataPayload = payload.slice(payload.length - payload.tell());

		switch (this.messageType) {
			case 2:
				this.data = Protocol16Deserializer.deserializeOperationRequest(dataPayload);
				this.parent.parent.emit('request', this.data);
				break;
			case 3:
				this.data = Protocol16Deserializer.deserializeOperationResponse(dataPayload);
				this.parent.parent.emit('response', this.data);
				break;
			case 4:
				this.data = Protocol16Deserializer.deserializeEventData(dataPayload);
				this.parent.parent.emit('event', this.data);
				break;
		}
	}

	parseReliableFragmentCommand() {
		if (this.payload.length - this.payload.tell() < 20) {
			throw new Error('Photon fragment command is truncated.');
		}

		const startSequenceNumber = this.payload.readUInt32BE();
		const fragmentCount = this.payload.readUInt32BE();
		const fragmentNumber = this.payload.readUInt32BE();
		const totalLength = this.payload.readUInt32BE();
		const fragmentOffset = this.payload.readUInt32BE();
		const data = this.payload.slice(this.payload.length - this.payload.tell()).buffer;

		if (fragmentCount <= 0 || fragmentNumber >= fragmentCount || totalLength <= 0 || fragmentOffset > totalLength) {
			throw new Error('Photon fragment command has invalid metadata.');
		}

		if (fragmentOffset + data.length > totalLength) {
			throw new Error('Photon fragment data exceeds total fragment length.');
		}

		const assembled = this.parent.parent.addFragment({
			channelId: this.channelId,
			startSequenceNumber,
			fragmentCount,
			fragmentNumber,
			totalLength,
			fragmentOffset,
			data,
		});

		if (assembled) {
			this.parseReliableBuffer(assembled);
		}
	}
}

module.exports = PhotonCommand;

export {};
