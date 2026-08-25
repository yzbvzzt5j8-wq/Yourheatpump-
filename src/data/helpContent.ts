export type HelpEntryType = 'article' | 'faq' | 'glossary';

export interface HelpEntry {
  id: string;
  type: HelpEntryType;
  title: string;
  body: string;
}

export const HELP_CONTENT: HelpEntry[] = [
  {
    id: 'b-factors', type: 'article', title: 'b-factors and why they matter',
    body: 'Each fabric element carries its own adjacency, not one setting for the room. A party wall to a heated neighbour (b=0) is not the same as an external wall (b=1). Charging a party wall at full external design temperature difference is a common and serious oversizing error.',
  },
  {
    id: 'partitions', type: 'article', title: 'Internal partitions between rooms',
    body: 'A bathroom at 22°C genuinely loses heat to a landing at 18°C. Omitting internal partition losses systematically undersizes rooms with a higher design temperature than their neighbours, most often bathrooms.',
  },
  {
    id: 'index-circuit', type: 'article', title: 'What is the index circuit?',
    body: 'The index circuit is the leaf circuit with the highest total path resistance to the heat pump — not the longest run, not the largest load. It is what pump duty is checked against, because it is the hardest circuit for the pump to serve.',
  },
  {
    id: 'length-vs-size', type: 'faq', title: 'Does a longer pipe run need a bigger pipe?',
    body: 'No. Pipe size is driven by flow rate alone. A longer run increases total pressure drop and pump head requirement, but does not change which pipe size is correct for the flow passing through it.',
  },
  {
    id: 'glycol-hydraulics', type: 'article', title: 'Glycol changes hydraulics, not just freeze protection',
    body: 'Propylene glycol reduces heat capacity (~15% less at 25% concentration), increases viscosity (~2.6x), and therefore increases the flow rate needed and the pressure drop for a given pipe. It also reduces emitter/coil heat transfer by roughly 25%. Sizing a system on water and then dosing glycol without correcting for this is a critical error.',
  },
  {
    id: 'open-volume', type: 'article', title: 'Open volume vs total volume',
    body: 'Open volume is what circulates with every TRV and zone valve closed. Manufacturer minimum volume requirements refer to open volume, not total system volume. An always-open area (no valves) contributes to open volume; a zoned area does not, because it can be isolated.',
  },
  {
    id: 'hybrid-55', type: 'faq', title: 'Does a hybrid heat pump need to meet 100% of the load?',
    body: 'No. The 100% rule applies to heat-pump-only systems. Hybrids are sized to MIS 3005-D (2025 revision): the heat pump must meet at least 55% of design load at 55°C flow temperature. Getting this confused fails compliant hybrid designs.',
  },
  {
    id: 'vat-esm', type: 'faq', title: 'Is heat pump installation always zero-rated for VAT?',
    body: 'No — do not assume everything is zero-rated. GB qualifying supply-and-install energy-saving materials currently carry a temporary 0% rate to 31 March 2027. Standard-rated supply, standard-rated additional work, Northern Ireland treatment, and custom confirmed rates are all separately available. The installer must confirm the treatment before a quote finalises.',
  },
  {
    id: 'markup-vs-margin', type: 'faq', title: "What's the difference between markup and margin?",
    body: 'A 20% markup on cost is only a 16.7% gross margin on the selling price — they are different percentages of different bases. Conflating them under-recovers overheads.',
  },
  {
    id: 'not-certified', type: 'faq', title: 'Does this app make my design MCS-compliant?',
    body: 'This application is a design aid, not MCS-certified documentation. MCS certifies installers and installations, and separately approves calculation software — an application itself cannot be "MCS compliant". Certified paperwork, the official MCS 020 sound assessment, and MCS database registration all happen outside this application.',
  },
  {
    id: 'sound-power-vs-pressure', type: 'glossary', title: 'Sound power (Lw) vs sound pressure (Lp)',
    body: 'Sound power (Lw, in dB(A)) is a property of the unit itself, independent of distance. Sound pressure (Lp) is what a listener actually hears at a given distance and depends on mounting position and any barriers. MCS 020 assessments work from sound power and derive pressure at the neighbour\'s window.',
  },
  {
    id: 'delta-50', type: 'glossary', title: 'Delta-50 (ΔT50)',
    body: 'The manufacturer test condition for radiator output: a 50°C mean water-to-room temperature difference. Actual output at a lower flow temperature is corrected using output = rated_D50 x (dT_actual/50)^1.3.',
  },
  {
    id: 'volumiser', type: 'glossary', title: 'Volumiser',
    body: 'A vessel plumbed in series (normally on the return) to make up open system volume when it falls short of the heat pump manufacturer\'s minimum. All water passes through it — unlike a buffer, there is no mixing or temperature penalty.',
  },
  {
    id: 'llh', type: 'glossary', title: 'Low loss header (LLH)',
    body: 'A hydraulic separation device between the heat pump primary and the distribution circuits, requiring a secondary pump on the distribution side.',
  },
];
