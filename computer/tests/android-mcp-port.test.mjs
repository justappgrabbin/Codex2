import test from 'node:test';
import assert from 'node:assert/strict';
import { createAndroidMcp } from '../services/trident-mcp-glue.mjs';
test('Android MCP uses configured loopback port', async () => {
  const client = createAndroidMcp({token:'test',port:8766,fetcher:async (url,opts)=>{
    assert.equal(url,'http://127.0.0.1:8766/mcp');
    assert.equal(opts.redirect,'error');
    return {ok:true,json:async()=>({id:JSON.parse(opts.body).id,result:{tools:[]}})};
  }});
  client.start();
  assert.deepEqual(await client.listTools(),[]);
  client.stop();
});
test('Android MCP rejects invalid ports',()=>{
  for(const port of ['0','65536','8765/other','example.com','1.5']) {
    assert.throws(()=>createAndroidMcp({port}),/Invalid Android MCP port/);
  }
});
