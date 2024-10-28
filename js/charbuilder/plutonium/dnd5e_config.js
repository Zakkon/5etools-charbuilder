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



CONFIG = {DND5E: DND5E};