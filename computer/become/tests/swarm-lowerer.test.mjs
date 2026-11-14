import test from 'node:test';
import assert from 'node:assert/strict';
import { lowerSwarm, SwarmRuntime } from '../swarm-lowerer.mjs';

const app = `
export function greet({ name = 'friend', excited }) { return \`Hello, \${name}\${excited ? '!' : '.'}\`; }
export const total = items => items.map(i => i.price * i.qty).reduce((a, b) => a + b, 0);
export function cheap(items, limit) { return items.filter(i => i.price < limit).map(i => i.name.toUpperCase()); }
export async function later(x) { const v = await x; return v + 1; }
export function grade(score) { let g = 'F'; if (score >= 90) { return 'A'; } else if (score >= 80) { return 'B'; } g = 'C'; return score >= 70 ? g : 'F'; }
export function Item({ name, price }) { return <li className="item">{name}: {price}</li>; }
export function Cart({ items }) {
  const [open, setOpen] = useState(false);
  return <div><button onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Show'} cart</button>
    {open ? <ul>{items.map(i => <Item name={i.name} price={i.price} />)}</ul> : null}</div>;
}
`;
const items = [{ name: 'tea', price: 3, qty: 2 }, { name: 'cake', price: 8, qty: 1 }];

test('real app code becomes formations', () => {
  const r = lowerSwarm(app, 'cart.jsx');
  for (const n of ['greet', 'total', 'cheap', 'later', 'grade', 'Item', 'Cart']) assert.ok(r.top.includes(n), n + ' ' + JSON.stringify(r.skipped));
});

test('the swarm runs objects, text, callbacks, async and branches', async () => {
  const sw = new SwarmRuntime(); sw.formFile(app, 'cart.jsx');
  assert.equal(await sw.run('cart.jsx', 'greet', [{ name: 'Adaya', excited: true }]), 'Hello, Adaya!');
  assert.equal(await sw.run('cart.jsx', 'greet', [{}]), 'Hello, friend.');
  assert.equal(await sw.run('cart.jsx', 'total', [items]), 14);
  assert.deepEqual(await sw.run('cart.jsx', 'cheap', [items, 5]), ['TEA']);
  assert.equal(await sw.run('cart.jsx', 'later', [Promise.resolve(41)]), 42);
  assert.deepEqual(await Promise.all([95, 85, 72, 10].map(s => sw.run('cart.jsx', 'grade', [s]))), ['A', 'B', 'C', 'F']);
});

test('components render to a form tree; tapping runs the handler on the swarm and state changes the form', async () => {
  const sw = new SwarmRuntime(); sw.formFile(app, 'cart.jsx');
  const draw = async () => sw.render(await sw.run('cart.jsx', 'Cart', [{ items }]));
  let tree = await draw();
  const button = tree.children[0];
  assert.equal(button.type, 'button'); assert.deepEqual(button.children, ['Show', ' cart']);
  await sw.kernel.vm.operators.get('invoke')([button.props.onClick]);   // the tap
  tree = await draw();
  assert.deepEqual(tree.children[0].children, ['Hide', ' cart']);
  const ul = tree.children[1]; assert.equal(ul.type, 'ul'); assert.equal(ul.children.length, 2);
  assert.equal(ul.children[0].type, 'li'); assert.deepEqual(ul.children[0].children, ['tea', ': ', 3]);
});
