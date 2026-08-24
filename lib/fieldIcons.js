import {
  Atom,
  BrainCircuit,
  Cog,
  Cpu,
  Dna,
  FlaskConical,
  Globe,
  Leaf,
  Rocket,
  Sigma,
  Sparkles,
  Stethoscope,
  Zap,
} from 'lucide-react'

// One icon + color per entry in context/helpers.js#getTranslatedFieldsDict,
// keyed the same way (Title Case, matches the `fields` array stored on a
// program doc). Used by OpportunityFieldIcons for the card/detail media
// slot in place of a photo — see lib/mockPrograms.js for why programs
// don't have real hosted images yet.
export const FIELD_ICONS = {
  Biology: {
    Icon: Dna,
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    fg: 'text-emerald-700 dark:text-emerald-300',
  },
  Chemistry: {
    Icon: FlaskConical,
    bg: 'bg-violet-100 dark:bg-violet-900/40',
    fg: 'text-violet-700 dark:text-violet-300',
  },
  'Cognitive Science': {
    Icon: BrainCircuit,
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    fg: 'text-pink-700 dark:text-pink-300',
  },
  'Computer Science': {
    Icon: Cpu,
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    fg: 'text-blue-700 dark:text-blue-300',
  },
  'Earth Science': {
    Icon: Globe,
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    fg: 'text-amber-700 dark:text-amber-300',
  },
  'Electrical Engineering': {
    Icon: Zap,
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    fg: 'text-yellow-700 dark:text-yellow-300',
  },
  'Environmental Science': {
    Icon: Leaf,
    bg: 'bg-green-100 dark:bg-green-900/40',
    fg: 'text-green-700 dark:text-green-300',
  },
  Mathematics: {
    Icon: Sigma,
    bg: 'bg-indigo-100 dark:bg-indigo-900/40',
    fg: 'text-indigo-700 dark:text-indigo-300',
  },
  'Mechanical Engineering': {
    Icon: Cog,
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    fg: 'text-slate-700 dark:text-slate-300',
  },
  Medicine: {
    Icon: Stethoscope,
    bg: 'bg-red-100 dark:bg-red-900/40',
    fg: 'text-red-700 dark:text-red-300',
  },
  Physics: {
    Icon: Atom,
    bg: 'bg-cyan-100 dark:bg-cyan-900/40',
    fg: 'text-cyan-700 dark:text-cyan-300',
  },
  'Space Science': {
    Icon: Rocket,
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    fg: 'text-purple-700 dark:text-purple-300',
  },
}

export const DEFAULT_FIELD_ICON = {
  Icon: Sparkles,
  bg: 'bg-muted',
  fg: 'text-muted-foreground',
}

export function getFieldIcon(field) {
  return FIELD_ICONS[field] || DEFAULT_FIELD_ICON
}
