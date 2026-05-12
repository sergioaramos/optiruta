/**
 * TSP Optimizer: Nearest Neighbor + 2-opt improvement
 * Uses a duration matrix (seconds) to find near-optimal route order
 * Works well for up to ~20 stops in browser in <200ms
 */

/**
 * Nearest Neighbor heuristic starting from index 0 (origin)
 * Returns ordered list of indices
 */
function nearestNeighbor(matrix) {
  const n = matrix.length
  const visited = new Array(n).fill(false)
  const tour = [0]
  visited[0] = true

  for (let i = 1; i < n; i++) {
    const current = tour[tour.length - 1]
    let best = -1
    let bestCost = Infinity

    for (let j = 0; j < n; j++) {
      if (!visited[j] && matrix[current][j] < bestCost) {
        bestCost = matrix[current][j]
        best = j
      }
    }
    tour.push(best)
    visited[best] = true
  }
  return tour
}

/**
 * 2-opt improvement: repeatedly swap edges if it reduces total cost
 */
function twoOpt(tour, matrix) {
  const n = tour.length
  let improved = true
  let best = [...tour]

  while (improved) {
    improved = false
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        // Cost of current edges: (i-1→i) + (j→j+1)
        const before = matrix[best[i - 1]][best[i]] + (j + 1 < n ? matrix[best[j]][best[j + 1]] : 0)
        // Cost after swap: (i-1→j) + (i→j+1)
        const after = matrix[best[i - 1]][best[j]] + (j + 1 < n ? matrix[best[i]][best[j + 1]] : 0)

        if (after < before - 0.01) {
          // Reverse the segment between i and j
          const newTour = [...best]
          let l = i, r = j
          while (l < r) {
            [newTour[l], newTour[r]] = [newTour[r], newTour[l]]
            l++; r--
          }
          best = newTour
          improved = true
        }
      }
    }
  }
  return best
}

function tourCost(tour, matrix) {
  let total = 0
  for (let i = 0; i < tour.length - 1; i++) {
    total += matrix[tour[i]][tour[i + 1]]
  }
  return total
}

/**
 * Main optimizer function
 * @param {number[][]} durationMatrix - NxN matrix (seconds), index 0 = origin
 * @returns {{ order: number[], totalDuration: number }}
 */
export function optimizeRoute(durationMatrix) {
  const nn = nearestNeighbor(durationMatrix)
  const optimized = twoOpt(nn, durationMatrix)
  const total = tourCost(optimized, durationMatrix)
  return { order: optimized, totalDuration: total }
}

/**
 * Reorder points array based on optimized order indices
 */
export function reorderPoints(points, order) {
  return order.map(i => points[i])
}
