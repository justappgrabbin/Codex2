// src/graph/mesh.js
/**
 * Multi-Scale Mesh: M(x) = {M_local, M_personal, M_value, M_scale, M_group}
 * Per §10: A single instance can belong simultaneously to multiple meshes,
 * propagating qualified state packets, not full memory copies.
 */
export class StateMesh {
  constructor(name, meshType) {
    this.name = name;
    this.meshType = meshType; // local, personal, value, scale, group
    this.members = new Map(); // stateId -> {stateId, activation, qualifiers, timestamp}
    this.packets = []; // propagated packets
  }

  join(stateId, qualifiers = {}, activation = 1.0) {
    this.members.set(stateId, {
      stateId,
      activation,
      qualifiers: { ...qualifiers },
      timestamp: Date.now(),
    });
    return this;
  }

  leave(stateId) {
    this.members.delete(stateId);
    return this;
  }

  // Propagate a qualified packet — not a full memory copy
  propagate(fromStateId, packet, qualifierFilter = null) {
    const sender = this.members.get(fromStateId);
    if (!sender) return [];

    const recipients = [];
    for (const [stateId, member] of this.members) {
      if (stateId === fromStateId) continue;
      if (qualifierFilter && !qualifierFilter(member.qualifiers)) continue;

      const qualifiedPacket = {
        ...packet,
        _mesh: this.name,
        _meshType: this.meshType,
        _sender: fromStateId,
        _recipient: stateId,
        _senderActivation: sender.activation,
        _timestamp: Date.now(),
      };

      this.packets.push(qualifiedPacket);
      recipients.push(qualifiedPacket);
    }

    return recipients;
  }

  // Get members filtered by qualifier
  filter(predicate) {
    return Array.from(this.members.values()).filter(m => predicate(m.qualifiers));
  }

  toJSON() {
    return {
      name: this.name,
      meshType: this.meshType,
      members: Array.from(this.members.values()),
      packetCount: this.packets.length,
    };
  }
}

export class MeshRegistry {
  constructor() {
    this.meshes = new Map();
  }

  create(name, meshType) {
    const mesh = new StateMesh(name, meshType);
    this.meshes.set(name, mesh);
    return mesh;
  }

  get(name) {
    return this.meshes.get(name);
  }

  byType(meshType) {
    return Array.from(this.meshes.values()).filter(m => m.meshType === meshType);
  }

  // Find all meshes a state belongs to
  memberships(stateId) {
    return Array.from(this.meshes.values()).filter(m => m.members.has(stateId));
  }

  toJSON() {
    return Array.from(this.meshes.values()).map(m => m.toJSON());
  }
}
