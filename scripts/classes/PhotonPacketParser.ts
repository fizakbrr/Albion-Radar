const PhotonPacket = require('./PhotonPacket');
const EventEmitter = require('events');

class PhotonPacketParser extends EventEmitter {
	[key: string]: any;

	constructor() {
		super();
		this.fragments = new Map();
	}

	handle(buff) {
		let packet;

		try {
			packet = new PhotonPacket(this, buff);
		} catch {
			return false;
		}

		this.emit('packet', packet);
		return true;
	}

	addFragment(fragment) {
		if (
			fragment.totalLength <= 0 ||
			fragment.fragmentCount <= 0 ||
			fragment.fragmentNumber >= fragment.fragmentCount ||
			fragment.fragmentOffset > fragment.totalLength ||
			fragment.fragmentOffset + fragment.data.length > fragment.totalLength
		) {
			return null;
		}

		const key = `${fragment.channelId}:${fragment.startSequenceNumber}`;
		let pending = this.fragments.get(key);

		if (!pending || pending.totalLength !== fragment.totalLength) {
			pending = {
				totalLength: fragment.totalLength,
				receivedBytes: 0,
				parts: new Set(),
				buffer: Buffer.alloc(fragment.totalLength),
			};
			this.fragments.set(key, pending);
		}

		if (!pending.parts.has(fragment.fragmentNumber)) {
			fragment.data.copy(pending.buffer, fragment.fragmentOffset);
			pending.receivedBytes += fragment.data.length;
			pending.parts.add(fragment.fragmentNumber);
		}

		if (pending.parts.size >= fragment.fragmentCount || pending.receivedBytes >= pending.totalLength) {
			this.fragments.delete(key);
			return pending.buffer;
		}

		return null;
	}
}

module.exports = PhotonPacketParser;

export {};
