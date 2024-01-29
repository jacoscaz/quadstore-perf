/*
 * This benchmark was ported from LevelGraph's searchStream.js benchmark
 * https://github.com/levelgraph/levelgraph/tree/d918ff445e78e22410b4b5388e33af4a4cbcec8c/benchmarks
 */

import { Quadstore } from 'quadstore';
import { main, runTest, time, waitForEvent } from './utils.js';
import { DataFactory } from 'rdf-data-factory';
import { Engine } from 'quadstore-comunica';

const dataFactory = new DataFactory();
const qty = 200000;

const doWrites = async (store: Quadstore) => {
  for (let i = 0; i < qty; i += 1) {
    await store.put(dataFactory.quad(
      dataFactory.namedNode(`ex://s${i}`),
      dataFactory.namedNode(`ex://p${i}`),
      dataFactory.namedNode(`ex://o${i}`),
      dataFactory.defaultGraph(),
    ));
  }
};

const doReads = async (store: Quadstore) => {
  const engine = new Engine(store);
  let count = 0;
  const iterator = await engine.queryBindings(`SELECT * WHERE { ?s ?p ?o . }`);
  iterator.on('data', (binding) => {
    count++;
  });
  iterator.on('error', (err) => {
    console.error(err);
  });
  await waitForEvent(iterator, 'end');
  return count;
};

main(async () => {

  runTest(async (backend, checkDiskUsage) => {
    const store = new Quadstore({
      backend,
      dataFactory,
    });
    await store.open();
    await doWrites(store);
    console.log('written to disk');
    const { time: readTime, value: readQty } = await time(() => doReads(store));
    const diskUsage = await checkDiskUsage();
    console.log('total time', readTime);
    console.log('total data', readQty);
    console.log('quad/s', readQty / readTime * 1000);
    console.log('disk usage', diskUsage);
    await store.close();
  });

});

