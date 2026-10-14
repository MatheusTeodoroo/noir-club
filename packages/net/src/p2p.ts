import type { ClientId, IceServer, P2PMessage } from '@mp/protocol';

type SignalData =
  { kind: 'offer'; sdp: string } | { kind: 'answer'; sdp: string } | { kind: 'ice'; candidate: RTCIceCandidateInit };

interface Peer {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
}

/**
 * Star of WebRTC DataChannels around the engine. Non-engine clients dial the engine; the engine
 * answers. Signaling goes through the relay. If a channel never opens, callers fall back to the relay.
 */
export class PeerMesh {
  private peers = new Map<ClientId, Peer>();

  constructor(
    private iceServers: () => Promise<IceServer[]>,
    private signal: (to: ClientId, data: SignalData) => void,
    private onMessage: (from: ClientId, msg: P2PMessage) => void,
  ) {}

  isOpen(id: ClientId): boolean {
    return this.peers.get(id)?.dc?.readyState === 'open';
  }

  send(id: ClientId, msg: P2PMessage): boolean {
    const dc = this.peers.get(id)?.dc;
    if (dc?.readyState !== 'open') return false;
    try {
      dc.send(JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  /** Client side: open a channel to the engine. */
  async dial(engineId: ClientId) {
    this.close(engineId);
    const pc = await this.createPc(engineId);
    const dc = pc.createDataChannel('mp', { ordered: true });
    this.peers.set(engineId, { pc, dc });
    this.wireChannel(engineId, dc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signal(engineId, { kind: 'offer', sdp: offer.sdp ?? '' });
  }

  async handleSignal(from: ClientId, raw: unknown) {
    const data = raw as SignalData;
    try {
      if (data.kind === 'offer') {
        this.close(from);
        const pc = await this.createPc(from);
        const peer: Peer = { pc, dc: null };
        this.peers.set(from, peer);
        pc.ondatachannel = (ev) => {
          peer.dc = ev.channel;
          this.wireChannel(from, ev.channel);
        };
        await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.signal(from, { kind: 'answer', sdp: answer.sdp ?? '' });
      } else if (data.kind === 'answer') {
        await this.peers.get(from)?.pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
      } else if (data.kind === 'ice') {
        await this.peers.get(from)?.pc.addIceCandidate(data.candidate);
      }
    } catch {
      this.close(from);
    }
  }

  close(id: ClientId) {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.peers.delete(id);
    try {
      peer.dc?.close();
      peer.pc.close();
    } catch {
      /* ignore */
    }
  }

  closeAll() {
    for (const id of [...this.peers.keys()]) this.close(id);
  }

  private async createPc(id: ClientId) {
    const pc = new RTCPeerConnection({ iceServers: (await this.iceServers()) as RTCIceServer[] });
    pc.onicecandidate = (ev) => {
      if (ev.candidate) this.signal(id, { kind: 'ice', candidate: ev.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        if (this.peers.get(id)?.pc === pc) this.close(id);
      }
    };
    return pc;
  }

  private wireChannel(id: ClientId, dc: RTCDataChannel) {
    dc.onmessage = (ev) => {
      try {
        this.onMessage(id, JSON.parse(String(ev.data)) as P2PMessage);
      } catch {
        /* ignore malformed */
      }
    };
  }
}
