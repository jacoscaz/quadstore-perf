/*
 * This benchmark was ported from LevelGraph's searchStream.js benchmark
 * https://github.com/levelgraph/levelgraph/tree/d918ff445e78e22410b4b5388e33af4a4cbcec8c/benchmarks
 */

import { Quadstore } from 'quadstore';
import { main, runTest, time, waitForEvent } from './utils.js';
import { DataFactory } from 'rdf-data-factory';
import assert from 'assert';
import * as xsd from './xsd.js';

const dataFactory = new DataFactory();
const qty = 2e6;

const doWrites = async (store: Quadstore) => {
  for (let i = 0; i < qty; i += 1) {
    await store.put(dataFactory.quad(
      dataFactory.namedNode(`ex://s`),
      dataFactory.namedNode(`ex://p`),
      dataFactory.literal(`${i}`, dataFactory.namedNode(xsd.decimal)),
      dataFactory.namedNode(`ex://g`),
    ));
  }
};

const doReads = async (store: Quadstore) => {
  let count = 0;
  // With the default set of indexes, the following (pattern,order) combination
  // leads to sorting in-memory.
  const results = await store.getStream(
    { graph: dataFactory.namedNode(`ex://g`) },
    { order: ['object'] },
  );
  assert(results.resorted, 'not resorted');
  results.iterator.on('data', (q) => {
    count++;
  });
  results.iterator.on('error', (err) => {
    console.error(err);
  });
  await waitForEvent(results.iterator, 'end');
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

