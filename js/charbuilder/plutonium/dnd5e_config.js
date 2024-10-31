DND5E = {};

DND5E.attunementTypes = {
    required: "DND5E.AttunementRequired",
    optional: "DND5E.AttunementOptional"
  };
DND5E.hitDieTypes = ["d4", "d6", "d8", "d10", "d12"];
DND5E.weaponTypes = {
  simpleM: "Simple Melee",
  simpleR: "Simple Ranged",
  martialM: "Martial Melee",
  martialR: "Martial Ranged",
  natural: "Natural",
  improv: "Improvised",
  siege: "Siege Weapon"
};
DND5E.rarities = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  veryRare: "Very Rare",
  legendary: "Legendary",
  artifact: "Artifact",
};
/**
 * Ways in which to activate an item that cannot be labeled with a cost.
 * @enum {string}
 */
/* DND5E.staticAbilityActivationTypes = {
  none: "DND5E.NoneActionLabel",
  special: DND5E.timePeriods.spec
}; */

DND5E.movementUnits = {
  ft: "DND5E.DistFt",
  mi: "DND5E.DistMi",
  m: "DND5E.DistM",
  km: "DND5E.DistKm"
};
/**
 * Various ways in which an item or ability can be activated.
 * @enum {string}
 */
DND5E.abilityActivationTypes = {
  /* ...DND5E.staticAbilityActivationTypes, */
  action: "DND5E.Action",
  bonus: "DND5E.BonusAction",
  reaction: "DND5E.Reaction",
  /* minute: DND5E.timePeriods.minute,
  hour: DND5E.timePeriods.hour,
  day: DND5E.timePeriods.day, */
  legendary: "DND5E.LegendaryActionLabel",
  mythic: "DND5E.MythicActionLabel",
  lair: "DND5E.LairActionLabel",
  crew: "DND5E.VehicleCrewAction"
};
DND5E.individualTargetTypes = {
  self: "DND5E.TargetSelf",
  ally: "DND5E.TargetAlly",
  enemy: "DND5E.TargetEnemy",
  creature: "DND5E.TargetCreature",
  object: "DND5E.TargetObject",
  space: "DND5E.TargetSpace",
  creatureOrObject: "DND5E.TargetCreatureOrObject",
  any: "DND5E.TargetAny",
  willing: "DND5E.TargetWilling"
};
DND5E.areaTargetTypes = {
  circle: {
    label: "DND5E.TargetCircle",
    template: "circle",
    sizes: ["radius"]
  },
  cone: {
    label: "DND5E.TargetCone",
    template: "cone",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.DqqAOr5JnX71OCOw",
    sizes: ["length"],
    standard: true
  },
  cube: {
    label: "DND5E.TargetCube",
    template: "rect",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.dRfDIwuaHmUQ06uA",
    sizes: ["width"],
    standard: true
  },
  cylinder: {
    label: "DND5E.TargetCylinder",
    template: "circle",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.jZFp4R7tXsIqkiG3",
    sizes: ["radius", "height"],
    standard: true
  },
  line: {
    label: "DND5E.TargetLine",
    template: "ray",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6DOoBgg7okm9gBc6",
    sizes: ["length", "width"],
    standard: true
  },
  radius: {
    label: "DND5E.TargetRadius",
    template: "circle",
    standard: true
  },
  sphere: {
    label: "DND5E.TargetSphere",
    template: "circle",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.npdEWb2egUPnB5Fa",
    sizes: ["radius"],
    standard: true
  },
  square: {
    label: "DND5E.TargetSquare",
    template: "rect",
    sizes: ["width"]
  },
  wall: {
    label: "DND5E.TargetWall",
    template: "ray",
    sizes: ["length", "thickness", "height"]
  }
};
DND5E.rangeTypes = {
  self: "DND5E.DistSelf",
  touch: "DND5E.DistTouch",
  spec: "DND5E.Special",
  any: "DND5E.DistAny"
};
DND5E.abilityConsumptionTypes = {
  ammo: "DND5E.ConsumeAmmunition",
  attribute: "DND5E.ConsumeAttribute",
  hitDice: "DND5E.ConsumeHitDice",
  material: "DND5E.ConsumeMaterial",
  charges: "DND5E.ConsumeCharges"
};
DND5E.limitedUsePeriods = {
  lr: {
    label: "DND5E.UsesPeriods.Lr",
    abbreviation: "DND5E.UsesPeriods.LrAbbreviation"
  },
  sr: {
    label: "DND5E.UsesPeriods.Sr",
    abbreviation: "DND5E.UsesPeriods.SrAbbreviation"
  },
  day: {
    label: "DND5E.UsesPeriods.Day",
    abbreviation: "DND5E.UsesPeriods.DayAbbreviation"
  },
  charges: {
    label: "DND5E.UsesPeriods.Charges",
    abbreviation: "DND5E.UsesPeriods.ChargesAbbreviation",
    formula: true,
    deprecated: true
  },
  dawn: {
    label: "DND5E.UsesPeriods.Dawn",
    abbreviation: "DND5E.UsesPeriods.DawnAbbreviation",
    formula: true
  },
  dusk: {
    label: "DND5E.UsesPeriods.Dusk",
    abbreviation: "DND5E.UsesPeriods.DuskAbbreviation",
    formula: true
  }
};
DND5E.scalarTimePeriods = {
  turn: "DND5E.TimeTurn",
  round: "DND5E.TimeRound",
  minute: "DND5E.TimeMinute",
  hour: "DND5E.TimeHour",
  day: "DND5E.TimeDay",
  month: "DND5E.TimeMonth",
  year: "DND5E.TimeYear"
};
DND5E.permanentTimePeriods = {
  disp: "DND5E.TimeDisp",
  dstr: "DND5E.TimeDispTrig",
  perm: "DND5E.TimePerm"
};
DND5E.specialTimePeriods = {
  inst: "DND5E.TimeInst",
  spec: "DND5E.Special"
};
DND5E.timePeriods = {
  ...DND5E.specialTimePeriods,
  ...DND5E.permanentTimePeriods,
  ...DND5E.scalarTimePeriods
};
DND5E.itemActionTypes = {
  mwak: "DND5E.ActionMWAK",
  rwak: "DND5E.ActionRWAK",
  msak: "DND5E.ActionMSAK",
  rsak: "DND5E.ActionRSAK",
  abil: "DND5E.ActionAbil",
  save: "DND5E.ActionSave",
  ench: "DND5E.ActionEnch",
  summ: "DND5E.ActionSumm",
  heal: "DND5E.ActionHeal",
  util: "DND5E.ActionUtil",
  other: "DND5E.ActionOther"
};
DND5E.abilities = {
  str: {
    label: "DND5E.AbilityStr",
    abbreviation: "DND5E.AbilityStrAbbr",
    type: "physical",
    fullKey: "strength",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.nUPv6C66Ur64BIUH",
    icon: "systems/dnd5e/icons/svg/abilities/strength.svg"
  },
  dex: {
    label: "DND5E.AbilityDex",
    abbreviation: "DND5E.AbilityDexAbbr",
    type: "physical",
    fullKey: "dexterity",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ER8CKDUWLsFXuARJ",
    icon: "systems/dnd5e/icons/svg/abilities/dexterity.svg"
  },
  con: {
    label: "DND5E.AbilityCon",
    abbreviation: "DND5E.AbilityConAbbr",
    type: "physical",
    fullKey: "constitution",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.MpA4jnwD17Q0RPg7",
    icon: "systems/dnd5e/icons/svg/abilities/constitution.svg"
  },
  int: {
    label: "DND5E.AbilityInt",
    abbreviation: "DND5E.AbilityIntAbbr",
    type: "mental",
    fullKey: "intelligence",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.WzWWcTIppki35YvF",
    icon: "systems/dnd5e/icons/svg/abilities/intelligence.svg",
    defaults: { vehicle: 0 }
  },
  wis: {
    label: "DND5E.AbilityWis",
    abbreviation: "DND5E.AbilityWisAbbr",
    type: "mental",
    fullKey: "wisdom",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.v3IPyTtqvXqN934s",
    icon: "systems/dnd5e/icons/svg/abilities/wisdom.svg",
    defaults: { vehicle: 0 }
  },
  cha: {
    label: "DND5E.AbilityCha",
    abbreviation: "DND5E.AbilityChaAbbr",
    type: "mental",
    fullKey: "charisma",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.9FyghudYFV5QJOuG",
    icon: "systems/dnd5e/icons/svg/abilities/charisma.svg",
    defaults: { vehicle: 0 }
  },
  hon: {
    label: "DND5E.AbilityHon",
    abbreviation: "DND5E.AbilityHonAbbr",
    type: "mental",
    fullKey: "honor",
    defaults: { npc: "cha", vehicle: 0 },
    improvement: false
  },
  san: {
    label: "DND5E.AbilitySan",
    abbreviation: "DND5E.AbilitySanAbbr",
    type: "mental",
    fullKey: "sanity",
    defaults: { npc: "wis", vehicle: 0 },
    improvement: false
  }
};
DND5E.damageTypes = {
  acid: {
    label: "DND5E.DamageAcid",
    icon: "systems/dnd5e/icons/svg/damage/acid.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.IQhbKRPe1vCPdh8v"
  },
  bludgeoning: {
    label: "DND5E.DamageBludgeoning",
    icon: "systems/dnd5e/icons/svg/damage/bludgeoning.svg",
    isPhysical: true,
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.39LFrlef94JIYO8m"
  },
  cold: {
    label: "DND5E.DamageCold",
    icon: "systems/dnd5e/icons/svg/damage/cold.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4xsFUooHDEdfhw6g"
  },
  fire: {
    label: "DND5E.DamageFire",
    icon: "systems/dnd5e/icons/svg/damage/fire.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.f1S66aQJi4PmOng6"
  },
  force: {
    label: "DND5E.DamageForce",
    icon: "systems/dnd5e/icons/svg/damage/force.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.eFTWzngD8dKWQuUR"
  },
  lightning: {
    label: "DND5E.DamageLightning",
    icon: "systems/dnd5e/icons/svg/damage/lightning.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.9SaxFJ9bM3SutaMC"
  },
  necrotic: {
    label: "DND5E.DamageNecrotic",
    icon: "systems/dnd5e/icons/svg/damage/necrotic.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.klOVUV5G1U7iaKoG"
  },
  piercing: {
    label: "DND5E.DamagePiercing",
    icon: "systems/dnd5e/icons/svg/damage/piercing.svg",
    isPhysical: true,
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.95agSnEGTdAmKhyC"
  },
  poison: {
    label: "DND5E.DamagePoison",
    icon: "systems/dnd5e/icons/svg/statuses/poisoned.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.k5wOYXdWPzcWwds1"
  },
  psychic: {
    label: "DND5E.DamagePsychic",
    icon: "systems/dnd5e/icons/svg/damage/psychic.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.YIKbDv4zYqbE5teJ"
  },
  radiant: {
    label: "DND5E.DamageRadiant",
    icon: "systems/dnd5e/icons/svg/damage/radiant.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.5tcK9buXWDOw8yHH"
  },
  slashing: {
    label: "DND5E.DamageSlashing",
    icon: "systems/dnd5e/icons/svg/damage/slashing.svg",
    isPhysical: true,
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.sz2XKQ5lgsdPEJOa"
  },
  thunder: {
    label: "DND5E.DamageThunder",
    icon: "systems/dnd5e/icons/svg/damage/thunder.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.iqsmMHk7FSpiNkQy"
  }
};
DND5E.healingTypes = {
  healing: {
    label: "DND5E.Healing",
    icon: "systems/dnd5e/icons/svg/damage/healing.svg"
  },
  temphp: {
    label: "DND5E.HealingTemp",
    icon: "systems/dnd5e/icons/svg/damage/temphp.svg"
  }
};

CONFIG = {DND5E: DND5E};