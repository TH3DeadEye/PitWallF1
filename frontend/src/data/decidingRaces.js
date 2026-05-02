/**
 * Championship-deciding race per season — used to focus the new "Race-level
 * analysis" charts (Pace distribution, Lap positions) on the moment that
 * actually mattered for the title fight.
 *
 * Picked editorially:
 *   - The race where the title was clinched, OR
 *   - The race that effectively ended the runner-up's challenge
 *
 * For 2014–2017 we still record a round even though FastF1 telemetry isn't
 * available pre-2018; the frontend gracefully degrades to "no telemetry data".
 */
export const DECIDING_RACES = {
  2014: { round: 19, name: 'Abu Dhabi GP', why: 'Double-points finale — Hamilton clinched.' },
  2015: { round: 16, name: 'United States GP', why: 'Hamilton clinched with three races to spare.' },
  2016: { round: 21, name: 'Abu Dhabi GP', why: 'Rosberg clinched the title in the final round.' },
  2017: { round: 17, name: 'Mexico City GP', why: 'Hamilton clinched after Vettel\'s post-summer collapse.' },
  2018: { round: 19, name: 'Mexico City GP', why: 'Hamilton clinched after Vettel\'s back-to-back collapse year.' },
  2019: { round: 19, name: 'United States GP', why: 'Hamilton clinched a sixth title.' },
  2020: { round: 14, name: 'Turkish GP', why: 'Hamilton tied Schumacher with seven titles.' },
  2021: { round: 22, name: 'Abu Dhabi GP', why: 'The final-lap, final-race, safety-car decision.' },
  2022: { round: 18, name: 'Japanese GP', why: 'Verstappen clinched in a rain-shortened race.' },
  2023: { round: 17, name: 'Qatar GP', why: 'Verstappen clinched mathematically in sprint format.' },
  2024: { round: 22, name: 'Las Vegas GP', why: 'Verstappen clinched in the inaugural night street race.' },
  2025: { round: 24, name: 'Abu Dhabi GP', why: 'Norris won by 2 points — the closest finish since 2007.' },
};
