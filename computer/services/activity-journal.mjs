/**
 * WIRE — keep Alexis's TrainingJournal across a restart.
 *
 * Her class records in memory and has no load(). This leaves the class as it
 * is, stores the records she returns with the Computer state file, and appends
 * the same entry to her event log. routeStats is rebuilt with the same
 * route-key update her record() method performs.
 */
import { TrainingJournal } from '../donors/Back-up-/vendor/synthia-core-v1.0.0/learning/training-journal.mjs';

const STATE_KEY = 'journal.trainingRecords';

function rebuildRouteStats(journal) {
  journal.routeStats = new Map();
  for (const record of journal.records) {
    const key = (record.toolPath || []).join('>') || '(none)';
    const stats = journal.routeStats.get(key) ?? { n: 0, total: 0, successes: 0 };
    stats.n += 1;
    stats.total += Number(record.score) || 0;
    if (record.success) stats.successes += 1;
    journal.routeStats.set(key, stats);
  }
}

export function openActivityJournal(computer) {
  const journal = new TrainingJournal();
  const saved = computer.state.get(STATE_KEY, []);
  if (Array.isArray(saved)) {
    journal.records = saved.map((record) => structuredClone(record));
    rebuildRouteStats(journal);
  }
  return {
    list() { return journal.records.map((record) => structuredClone(record)); },
    rank() { return journal.rankRoutes(); },
    async write(input = {}) {
      const text = typeof input.text === 'string' ? input.text : '';
      const task = typeof input.task === 'string' && input.task.trim() ? input.task.trim() : text.trim();
      if (!task) throw new TypeError('A journal entry needs text.');
      if (task.length > 8000) throw new RangeError('Journal entry is too long.');
      // Her record() clones these fields. Undefined cannot be cloned, so omitted
      // fields are null. The entry itself is still her TrainingJournal record.
      const record = journal.record({
        task,
        stateBefore: input.stateBefore ?? null,
        toolPath: Array.isArray(input.toolPath) ? input.toolPath.map(String) : [],
        interaction: input.interaction ?? { text: task },
        stateAfter: input.stateAfter ?? null,
        observedExpression: typeof input.observedExpression === 'string' ? input.observedExpression : task,
        success: input.success !== false,
        error: input.error ?? null,
        score: input.score ?? null,
        metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : { source: 'activity-journal' },
      });
      await computer.state.set(STATE_KEY, journal.records, { source: 'activity-journal' });
      await computer.emitEvent({
        actor_id: 'user',
        actor_type: 'user',
        event_type: 'user_action',
        input: { kind: 'journal', id: record.id, task: record.task },
        result_status: record.success ? 'success' : 'failure',
        observable_effect: 'activity journal entry',
        trajectory_id: 'traj-activity-journal',
      });
      return record;
    },
  };
}
