import { getDb } from '../src/db/client';
import { bootstrapFromFixtures, loadFixtures } from '../src/db/bootstrap';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    const fixtures = await loadFixtures();
    console.log(
      `local mode: fixtures are valid (${fixtures.cars.length} cars, ${fixtures.prices.length} market prices); nothing to load`,
    );
    return;
  }
  const { carsLoaded, pricesLoaded } = await bootstrapFromFixtures(await getDb());
  console.log(`bootstrap done: ${carsLoaded} cars loaded, ${pricesLoaded} market prices loaded`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
