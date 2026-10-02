import { makeOptions } from '../lib/options.js';
import { runMixedIteration } from '../lib/actions.js';

const { options } = makeOptions();
export { options };

export default function () {
  runMixedIteration();
}
