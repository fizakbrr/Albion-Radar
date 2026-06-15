const PhotonPacket = require('./PhotonPacket');
const EventEmitter = require('events');

class PhotonPacketParser extends EventEmitter {
	constructor() {
		super();
		this.fragments = new Map();
	}

	handle(buff) {
		this.emit('packet', new PhotonPacket(this, buff));
	}

	addFragment(fragment) {
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
