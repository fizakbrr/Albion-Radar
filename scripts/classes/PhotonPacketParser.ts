const PhotonPacket = require('./PhotonPacket');
const EventEmitter = require('events');

class PhotonPacketParser extends EventEmitter {
	[key: string]: any;

	constructor() {
		super();
		this.fragments = new Map();
		// ponytail: incomplete fragment sequences are evicted after this TTL so packet
		// loss or malformed streams can't grow the map forever.
		this.fragmentTtlMs = 10000;
		this.maxFragmentTotalLength = 1048576;
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
		const now = Date.now();
		for (const [key, pending] of this.fragments) {
			if (now - pending.firstSeenAt > this.fragmentTtlMs) {
				this.fragments.delete(key);
			}
		}

		if (
			fragment.totalLength <= 0 ||
			fragment.totalLength > this.maxFragmentTotalLength ||
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
				firstSeenAt: now,
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
