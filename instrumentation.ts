import { assertProductionEnvironment } from './lib/env';

export function register() {
  assertProductionEnvironment();
}
