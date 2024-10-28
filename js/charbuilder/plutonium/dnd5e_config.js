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


CONFIG = {DND5E: DND5E};