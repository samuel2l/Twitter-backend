export type ScoredPost = {
  id: string;
  score: number;
};

export type InterestPool = {
  label: string;
  weight: number;
  posts: ScoredPost[];
};

// Merges multiple interest pools into a single feed, ensuring proportional representation from each pool.

// example run

// Input: tech 0.7 → [A,B,C], sports 0.3 → [X,Y], limit = 5

// Loop iteration 1
// merged = []  →  merged.length + 1 = 1
// indices = [0, 0], picked = [0, 0]
// Deficit loop (i=0 tech):

// targetShare = (0.7 / 1.0) * 1 = 0.7
// deficit     = 0.7 - 0 = 0.7   // best so far
// Deficit loop (i=1 sports):

// targetShare = (0.3 / 1.0) * 1 = 0.3
// deficit     = 0.3 - 0 = 0.3   // less than 0.7
// → bestPoolIndex = 0 (tech)

// candidate = posts[0] = A
// indices   = [1, 0]
// picked    = [1, 0]
// seen      = { A }
// merged    = [A]
// Loop iteration 2
// merged.length + 1 = 2
// indices = [1, 0], picked = [1, 0]
// Tech (i=0):

// targetShare = 0.7 * 2 = 1.4
// deficit     = 1.4 - 1 = 0.4
// Sports (i=1):

// targetShare = 0.3 * 2 = 0.6
// deficit     = 0.6 - 0 = 0.6   // wins
// → sports → X

// indices = [1, 1]
// picked  = [1, 1]
// merged  = [A, X]
// and so on until we have merged the required number of posts

export function mergeInterestPools(
  pools: InterestPool[],
  limit: number,
): ScoredPost[] {
  if (pools.length === 0 || limit <= 0) return [];

  const activePools = pools.filter((pool) => pool.posts.length > 0);
  if (activePools.length === 0) return [];

  const totalWeight = activePools.reduce((sum, pool) => sum + pool.weight, 0);
  if (totalWeight <= 0) return [];

  // Next post index to read in each pool (0 = first post)
  // eg indices  = [0, 0]   both at first post

  const indices = activePools.map(() => 0);
  	
  // How many times each pool was chosen this run
  // eg picked  = [0, 0]     // neither chosen yet

  const picked = activePools.map(() => 0);
  const seen = new Set<string>();
  const merged: ScoredPost[] = [];

  while (merged.length < limit) {
    // Track which pool is most "owed" a turn. Start with no winner (-1) and worst possible deficit (-Infinity).
    let bestPoolIndex = -1;
    let bestDeficit = -Infinity;

    for (let i = 0; i < activePools.length; i++) {
      const pool = activePools[i]!;
      // indices[i]! is the index of the next post to read in the i-th pool
      //so if it is greater than or equal to the number of posts in the pool it means we are done with that pool so skip
      if (indices[i]! >= pool.posts.length) continue;

      const targetShare = (pool.weight / totalWeight) * (merged.length + 1);
      const deficit = targetShare - picked[i]!;

      if (deficit > bestDeficit) {
        // keep updating the best deficit and the best pool index until we find the pool with the highest deficit
        bestDeficit = deficit;
        bestPoolIndex = i;
      }
    }

    if (bestPoolIndex === -1) break;

    const candidate =
      activePools[bestPoolIndex]!.posts[indices[bestPoolIndex]!]!;
    indices[bestPoolIndex]! += 1;
    picked[bestPoolIndex]! += 1;

    if (seen.has(candidate.id)) continue;

    seen.add(candidate.id);
    merged.push(candidate);
  }

  return merged;
}
