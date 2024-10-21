class DataConverterItem extends DataConverter {
	static _configGroup = "importItem";

	static _SideDataInterface = SideDataInterfaceItem;
	//static _ImageFetcher = ImageFetcherItem;

	static async pGetActionWeaponDetails (
		{
			size,
			action,
			damageParts,
			isSiegeWeapon,
			isMagical = false,
			isInfiniteAmmo = false,
			isApplyWeaponDetails = false,
			isProficient = false,
			taskRunner = null,
			actorMultiImportHelper = null,
		},
	) {
		await Renderer.item.pPopulatePropertyAndTypeReference();

		await this._pGetActionWeaponDetails_initCaches({taskRunner});

		const out = {
			system: {
				"type.value": "natural",
			},
		};

		const weaponLookupName = Renderer.monsterAction.getWeaponLookupName(action);

		const weapon = isApplyWeaponDetails && DataConverterItem._WEAPON_DETAIL_CACHE[weaponLookupName]
			? MiscUtil.copyFast(DataConverterItem._WEAPON_DETAIL_CACHE[weaponLookupName])
			: null;

		if (weapon) {
			const itemData = await this.pGetDocumentJson(
				weapon,
				{
					size,
					isEquipped: true,
					quantity: 1,
					isActorItem: true,
					isInfiniteAmmo,
					isProficient,
					taskRunner,
					actorMultiImportHelper,
				},
			);
			Object.entries(itemData)
				.forEach(([prop, values]) => {
					if (["folder", "ownership", "sort"].includes(prop)) return;

					if (values == null) return out[prop] = values;
					if (typeof values !== "object") return out[prop] = MiscUtil.copyFast(values);

					out[prop] = out[prop] || {};
					Object.assign(out[prop], foundry.utils.flattenObject(values));
				});

						if (weapon._fvttImage) out.img = weapon._fvttImage;
		}

				if (
			damageParts.length > 1
			&& (
				(weapon?.property || []).some(uid => DataUtil.itemProperty.unpackUid(uid).abbreviation === Parser.ITM_PROP_ABV__VERSATILE)
				|| this._RE_IS_VERSATILE.test(JSON.stringify(action.entries || []))
			)
		) {
						const damageTypePrimary = damageParts[0][1];
			if (damageTypePrimary) {
				const ixDamagePartVersatile = damageParts.slice(1).findIndex(it => it[1] === damageTypePrimary);
				if (~ixDamagePartVersatile) {
					damageParts = MiscUtil.copyFast(damageParts);
										const cntVersatileParts = ixDamagePartVersatile + 1;
					const damagePartsVersatile = damageParts.splice(ixDamagePartVersatile + 1, cntVersatileParts);

																				out.system["damage.versatile"] = damagePartsVersatile[0][0];
					if (!(out.system.properties ||= []).includes("ver")) out.system.properties.push("ver");
				}
			}
		}
		
		if (isSiegeWeapon) out.system["type.value"] = "siege";

				out.system["damage.parts"] = damageParts;

				if (isMagical) {
			if (!(out.system.properties ||= []).includes("mgc")) out.system.properties.push("mgc");
		}
		
		return out;
	}

	static async _pGetActionWeaponDetails_initCaches ({taskRunner = null} = {}) {
		if (DataConverterItem._WEAPON_DETAIL_CACHE_INIT) return;

		await DataConverterItem._WEAPON_DETAIL_CACHE_LOCK.pLock();
		try {
			if (DataConverterItem._WEAPON_DETAIL_CACHE_INIT) return;

			console.log(...LGT, "Pre-caching item lookup...");

						const {item: items} = await Vetools.pGetItems();

			for (const item of items) {
				if ((item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null) === Parser.ITM_TYP_ABV__GENERIC_VARIANT) continue;

				const lowName = item.name.toLowerCase();
								const prefixBonusKey = lowName.replace(/^(.*?)( \+\d+$)/, (...m) => `${m[2].trim()} ${m[1].trim()}`);
								const suffixBonusKey = lowName.replace(/^(\+\d+) (.*?)$/, (...m) => `${m[2].trim()} ${m[1].trim()}`);
				const suffixBonusKeyComma = lowName.replace(/^(\+\d+) (.*?)$/, (...m) => `${m[2].trim()}, ${m[1].trim()}`);

				const itemKeys = [
					lowName,
					prefixBonusKey === lowName ? null : prefixBonusKey,
					suffixBonusKey === lowName ? null : suffixBonusKey,
					suffixBonusKeyComma === lowName ? null : suffixBonusKeyComma,
				].filter(Boolean);

				const cpy = MiscUtil.copyFast(item);
				const procFluff = await Renderer.item.pGetFluff(cpy);
				const foundryType = await this._pGetItemImporterType(cpy);
				cpy._fvttImage = await this._ImageFetcher.pGetImagePath(cpy, {fluff: procFluff, propCompendium: "item", foundryType, taskRunner});

				itemKeys.forEach(k => {
					if (!DataConverterItem._WEAPON_DETAIL_CACHE[k]) {
						DataConverterItem._WEAPON_DETAIL_CACHE[k] = cpy;
						return;
					}

										const existing = DataConverterItem._WEAPON_DETAIL_CACHE[k];
					if (
						!(existing.source === Parser.SRC_DMG || existing.source === Parser.SRC_PHB)
						&& SourceUtil.isNonstandardSource(existing.source)
					) {
						DataConverterItem._WEAPON_DETAIL_CACHE[k] = cpy;
					}
				});
			}

			console.log(...LGT, "Pre-caching complete.");

			DataConverterItem._WEAPON_DETAIL_CACHE_INIT = true;
		} finally {
			DataConverterItem._WEAPON_DETAIL_CACHE_LOCK.unlock();
		}
	}

		static async pGetDocumentJson (item, opts) {
		opts = opts || {};

		opts.actorType = opts.actorType || "character";

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		await Renderer.item.pPopulatePropertyAndTypeReference();

		const entriesWithoutNotes = this._getEntriesWithoutNotes(item._fullEntries || item.entries);
		const entriesStr = entriesWithoutNotes ? JSON.stringify(entriesWithoutNotes) : "";

				if (item._isItemGroup) return this._pGetItemItem_loot(item, opts, entriesStr);

		const srdData = await CompendiumCache.pGetAdditionalDataDoc(
			"item",
			item,
			{
				isSrdOnly: true,
				keyProvider: UtilEntityItem.getCompendiumCacheKeyProvider({isStrict: true}),
				taskRunner: opts.taskRunner,
			},
		);

		const out = srdData
			? await this._pGetItemItem_fromSrd(item, opts, srdData)
			: await this._pGetItemItem_notFromSrd(item, opts, entriesStr);

		if (opts.containerId) {
			MiscUtil.set(out, "system", "container", opts.containerId);
		}

		this._mutApplyDocOwnership(out, opts);

				const replacementMeta = await CompendiumCache.gGetReplacementDataDocMeta("item", item);
		if (replacementMeta) {
			const {docData: replacementData, uuid: replacementUuid} = replacementMeta;

			const toKeep = [
				["id"],
				["_id"],
				["system", "quantity"],
				["system", "attuned"],
				["system", "identified"],
				["system", "equipped"],
				["system", "proficient"],
				["system", "container"],
				["ownership"],
				["flags", SharedConsts.MODULE_ID],
			];

			if (
				opts.isInfiniteAmmo
				&& replacementData?.system?.consume?.type === "ammo"
			) {
				toKeep.push(["system", "consume"]);
			}

			toKeep.forEach(path => MiscUtil.getThenSetCopy(out, replacementData, ...path));

			IntegrationItemLinking.setFlags({replacementData, replacementUuid});

			return replacementData;
		}
		
		return out;
	}

	static _getEntriesWithoutNotes (entries) {
		if (!entries?.length) return null;

		entries = MiscUtil.copyFast(entries);

		const walker = MiscUtil.getWalker();
		entries = walker
			.walk(
				entries,
				{
					string: (str) => {
						const tagSplit = Renderer.splitByTags(str);
						const len = tagSplit.length;
						let out = "";
						for (let i = 0; i < len; ++i) {
							const s = tagSplit[i];
							if (!s || s.startsWith("{@note ")) continue;
							out += s;
						}
						return out;
					},
				},
			);

		entries = walker
			.walk(
				entries,
				{
					array: (arr) => arr.filter(it => typeof it !== "string" || it.length),
				},
			);

		return entries;
	}

	static async _pGetItemImporterType (item, {actorType = null} = {}) {
		const sideLoadedType = await this._SideDataInterface.pGetSideLoadedType(item, {actorType: actorType});
		if (sideLoadedType != null) return sideLoadedType;

		const fallback = UtilsFoundryItem.getFoundryItemType(item);
		if (!UtilDocumentItem.TYPES_ITEM.has(fallback)) throw new Error(`Unknown item type "${fallback}"!`);

		return fallback;
	}

	static _pGetItemItem_getWeaponType (item) {
		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;

		if (itemTypeAbv === Parser.ITM_TYP_ABV__AMMUNITION || itemTypeAbv === Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC) return "ammo";

		if (itemTypeAbv === Parser.ITM_TYP_ABV__MELEE_WEAPON || itemTypeAbv === Parser.ITM_TYP_ABV__RANGED_WEAPON) {
			if ((item.weaponCategory || "").toLowerCase() === "martial") return `martial${itemTypeAbv}`;
			else if ((item.weaponCategory || "").toLowerCase() === "simple") return `simple${itemTypeAbv}`;
		}

		return "improv";
	}

	static _pGetItemItem_getLootType (item) {
		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;

		if (itemTypeAbv === Parser.ITM_TYP_ABV__TREASURE_ART_OBJECT) return "art";
		if (itemTypeAbv === Parser.ITM_TYP_ABV__TREASURE_GEMSTONE) return "gem";
		if (UtilEntityItem.isTreasureItem(item)) return "treasure";

				if (
			itemTypeAbv === Parser.ITM_TYP_ABV__TRADE_GOOD
		) return "material";

		if (
						itemTypeAbv === Parser.ITM_TYP_ABV__WAND
			|| itemTypeAbv === Parser.ITM_TYP_ABV__ROD
			|| itemTypeAbv === Parser.ITM_TYP_ABV__ADVENTURING_GEAR
			
			|| itemTypeAbv === Parser.ITM_TYP_ABV__FOOD_AND_DRINK
			|| itemTypeAbv === Parser.ITM_TYP_ABV__TACK_AND_HARNESS
		) return "gear";

		if (
			itemTypeAbv === Parser.ITM_TYP_ABV__OTHER 		) {
						if (
				["none", "unknown"].includes(item.rarity)
				&& !item.value
			) return "junk";
			return "gear";
		}

		return "gear";
	}

	static _getItemFlags (item, opts) {
		opts = opts || {};

		const out = {
			[SharedConsts.MODULE_ID]: {
				page: UrlUtil.PG_ITEMS,
				source: item.source,
				hash: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS](item),
			},
		};

		if (opts.isAddDataFlags) {
			out[SharedConsts.MODULE_ID].propDroppable = "item";
			out[SharedConsts.MODULE_ID].filterValues = opts.filterValues;
		}

		return out;
	}

	static async _pGetItemItem_notFromSrd (item, opts, entriesStr) {
		const importType = await this._pGetItemImporterType(item, opts);

		switch (importType) {
			case UtilDocumentItem.TYPE_WEAPON: return this._pGetItemItem_weapon(item, opts, entriesStr);
			case UtilDocumentItem.TYPE_TOOL: return this._pGetItemItem_tool(item, opts, entriesStr);
			case UtilDocumentItem.TYPE_CONSUMABLE: return this._pGetItemItem_consumable(item, opts, entriesStr);
			case UtilDocumentItem.TYPE_EQUIPMENT: return this._pGetItemItem_equipment(item, opts, entriesStr);
			case UtilDocumentItem.TYPE_CONTAINER: return this._pGetItemItem_container(item, opts, entriesStr);
			case UtilDocumentItem.TYPE_LOOT: return this._pGetItemItem_loot(item, opts, entriesStr);
			default: throw new Error(`Unhandled importer type "${importType}"`);
		}
	}

	static async _pGetItemItem_fromSrd (item, opts = {}, srdData) {
		const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
			translationData: this._getTranslationData({srdData}),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			description: await DataConverterItem._getItemItem_pGetItemDescription(item),
		});

		const foundryType = item.foundryType || srdData.type;
		const rangeMeta = this._getWeaponRange(item, {srdData});
		const {weight, price, rangeShort, rangeUnits, rangeLong} = this._pGetItemItem_getWeightPriceRange(item, opts.size, rangeMeta);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);
		const {consumeType, consumeTarget, consumeAmount} = this._pGetItemItem_getAmmoConsumeDetails(item, opts);
		const {acValue, maxDexBonus} = UtilEntityItem.getAcInfo(item);
		const itemProperties = this._getItemProperties(item);

		const consume = {...(srdData.system.consume || {})};
		consume.type ||= consumeType;
		consume.target ||= consumeTarget;
		consume.amount ||= consumeAmount;

		const systemBase = {
			...srdData.system,

			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: translatedDescription, chat: ""},

			proficient: opts.isProficient === undefined ? UtilItems.PROFICIENCY_LEVELS.AUTO : opts.isProficient,
			quantity: opts.quantity != null ? opts.quantity : (item.quantity || 1),
			weight,
			price,
			attuned: isAttuned,
			identified: isIdentified,
			equipped: opts.isEquipped ?? isEquipped,
			rarity: this._getItemItem_getRarity(item),
			consume,
			target: this._getWeaponTargetDataDefault({srdData}),
			range: {value: rangeShort, long: rangeLong, units: rangeUnits},

			armor: {
				value: acValue,
				dex: maxDexBonus,
			},

			ability: opts.ability ?? srdData.system.ability,
			properties: itemProperties,

			attunement,
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});
		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		return {
			...UtilFoundryId.getIdObj(),
			name: translatedName,
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: foundry.utils.mergeObject(
				{
					...translatedFlags,
					...this._getItemFlags(item, opts),
				},
				additionalFlags,
			),
									effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static _pGetItemItem_getVersionCompatibleWeight ({weightLbs = 0}) {
		if (!UtilVersions.getSystemVersion().isVersionThreeTwoPlus) return Config.getMetricNumberWeight({configGroup: "importItem", originalValue: weightLbs, originalUnit: Parser.UNT_LBS});

		return {
			value: Config.getMetricNumberWeight({
				configGroup: "importItem",
				originalValue: weightLbs,
				originalUnit: Parser.UNT_LBS,
			}),
			units: Config.getMetricUnitWeight({
				configGroup: "importItem",
				originalUnit: Parser.UNT_LBS,
			}),
		};
	}

	static _pGetItemItem_getWeightPriceRange (item, size, {rangeShort, rangeLong, rangeUnits} = {}) {
		let weight = null;
		let price = null;
		let tmpValue = null;

		if (size == null || size === Parser.SZ_MEDIUM) {
			return {
				weight: this._pGetItemItem_getVersionCompatibleWeight({weightLbs: item.weight || 0}),
				price: !isNaN(item.value) ? UtilDocumentItem.getPrice({cp: item.value}) : null,
				rangeShort: Config.getMetricNumberDistance({configGroup: "importItem", originalValue: rangeShort || 0, originalUnit: "ft"}),
				rangeLong: Config.getMetricNumberDistance({configGroup: "importItem", originalValue: rangeLong || 0, originalUnit: "ft"}),
				rangeUnits: Config.getMetricUnitDistance({configGroup: "importItem", originalUnit: rangeUnits}),
			};
		}

		const weightValueScalingMode = Config.get("importCreature", "itemWeightAndValueSizeScaling");

		switch (weightValueScalingMode) {
						case ConfigConsts.C_CREATURE_ITEM_SCALING__NONE: {
				weight = item.weight || 0;
				tmpValue = item.value;
				break;
			}

						case ConfigConsts.C_CREATURE_ITEM_SCALING__MULTIPLICATIVE: {
				const weightMult = DataConverterItem._SIZE_TO_ITEM_WEIGHT_MULT[size] || 1;
				const valueMult = DataConverterItem._SIZE_TO_ITEM_VALUE_MULT[size] || 1;

				if (item.weight && !isNaN(item.weight)) {
					weight = Number(item.weight) * weightMult;
				}

				if (item.value && !isNaN(item.value)) {
					tmpValue = item.value * valueMult;
				}

				break;
			}

						case ConfigConsts.C_CREATURE_ITEM_SCALING__EXPONENTIAL: {
				const exponent = DataConverterItem._SIZE_TO_ITEM_WEIGHT_AND_VALUE_EXPONENT[size] || 1;

				if (item.weight && !isNaN(item.weight)) {
					weight = Math.floor(item.weight ** exponent);
				}

				if (item.value && !isNaN(item.value)) {
					const factor = item.value < 10 ? 1 : item.value < 100 ? 10 : 100;

										tmpValue = item.value / factor;

										tmpValue = Math.floor(tmpValue ** exponent);

										tmpValue *= factor;
				}

				break;
			}
		}

		if (tmpValue) price = UtilDocumentItem.getPrice({cp: tmpValue});

		return {
			weight: this._pGetItemItem_getVersionCompatibleWeight({weightLbs: weight || 0}),
			price,

						rangeShort: Config.getMetricNumberDistance({configGroup: "importItem", originalValue: rangeShort || 0, originalUnit: "ft"}),
			rangeLong: Config.getMetricNumberDistance({configGroup: "importItem", originalValue: rangeLong || 0, originalUnit: "ft"}),
			rangeUnits: Config.getMetricUnitDistance({configGroup: "importItem", originalUnit: rangeUnits}),
		};
	}

		static async _pGetItemItem_pGetAttunedIdentifiedEquipped (item, opts) {
		opts = opts || {};

						const isMundane = item.rarity === "none" || item.rarity === "unknown" || item._category === "basic";
		const isAttuned = !isMundane && !!item.reqAttune;

		const isEquipped = await this._pGetItemItem_pGetAttunedIdentifiedEquipped_equipped(item, opts);

		const kIsIdentified = opts.isActorItem
			? isMundane ? "mundaneActor" : "magicActor"
			: isMundane ? "mundane" : "magic"
		;

		const out = {
			isAttuned,
			isIdentified: true,//!!Config.get("importItem", "identified")[kIsIdentified],
			isEquipped,
		};

				if (!UtilVersions.getSystemVersion().isVersionThreeTwoPlus) {
						out.attunement = item.reqAttune
				? Config.get("importItem", opts.isActorItem ? "attunementTypeActor" : "attunementType")
				: CONFIG.DND5E.attunementTypes.NONE;

			return out;
		}

		out.attunement = item.reqAttune == null
			? "" 			: item.reqAttune === "optional"
								? "optional"
				: "required";

		return out;
	}

	static async _pGetItemItem_pGetAttunedIdentifiedEquipped_equipped (item, opts) {
				if (opts.containerId) return false;

		const importType = await this._pGetItemImporterType(item, opts);
		switch (importType) {
			case UtilDocumentItem.TYPE_WEAPON: return true;
			case UtilDocumentItem.TYPE_TOOL: return false;
			case UtilDocumentItem.TYPE_CONSUMABLE: return false;
			case UtilDocumentItem.TYPE_EQUIPMENT: return true;
			case UtilDocumentItem.TYPE_CONTAINER: return true;
			case UtilDocumentItem.TYPE_LOOT: return false;
			default: throw new Error(`Unhandled importer type "${importType}"`);
		}
	}

	static _getItemItem_pGetItemDescription (item) {
		if (!Config.get("importItem", "isImportDescription")) return "";

		return DescriptionRenderer.pGetWithDescriptionPlugins(
			() => this._getItemItem_pGetItemDescription_(item),
		);
	}

	static _getItemItem_pGetItemDescription_ (item) {
				const [damage, damageType, propertiesTxt] = Renderer.item.getDamageAndPropertiesText(item);
		const [typeRarityText, subTypeText, tierText] = Renderer.item.getTypeRarityAndAttunementText(item);

		const headerPart = Config.get("importItem", "isImportDescriptionHeader")
			? `<div>
				${Renderer.item.getTypeRarityAndAttunementHtml(typeRarityText, subTypeText, tierText)}
					<div class="ve-flex w-100">
						<div class="ve-col-4">${[Parser.itemValueToFull(item), Parser.itemWeightToFull(item)].filter(Boolean).join(", ").uppercaseFirst()}</div>
						<div class="ve-col-8 ve-text-right">${damage} ${damageType} ${propertiesTxt}</div>
					</div>
				</div>
			<hr>`
									: item.reqAttune && item.reqAttune !== true
				? `<div><i>${item._attunement}</i></div>`
				: "";

		const bodyPart = Renderer.item.getRenderedEntries(
			item,
			{
				isCompact: true,
				wrappedTypeAllowlist: Config.get("importItem", "isImportDescriptionHeader")
					? null
					: new Set([
												"type.SCF",
												"magicvariant",
					]),
			},
		);

		return `${headerPart}
		${bodyPart}`;
	}

	static _getItemItem_getItemUses (item) {
		let charges = null;

		if (item.charges) {
			if (isNaN(item.charges)) {
				const mDice = /{@dice (?<count>\d)+d(?<faces>\d+)\s*(?<bonus>[-+]\s*\d+)?}/i.exec(item.charges);
				if (mDice) {
					charges = (Number(mDice.groups.count) * Number(mDice.groups.faces)) + (mDice.groups.bonus ? Number(mDice.groups.bonus.replace(/\s*/g, "")) : 0);
				}
			} else charges = item.charges;
		}

		const usesPer = item.charges ? "charges" : UtilDataConverter.getFvttUsesPer(item.recharge);

		let usesRecovery = null;
		if (item.rechargeAmount) {
			if (typeof item.rechargeAmount === "number") {
				usesRecovery = item.rechargeAmount;
			} else {
				const mDice = /{@dice (?<formula>\d+d\d+\s*(?:[-+]\s*\d+)?)}/i.exec(item.rechargeAmount);
				if (mDice) {
					usesRecovery = mDice.groups.formula;
				}
			}
		}

		return {uses: charges, usesPer, usesRecovery};
	}

	static _getItemItem_getRarity (item) {
		const rawRarity = `${(item.rarity || "unknown")}`.toLowerCase().trim();

		switch (rawRarity) {
			case "common": return "common";
			case "uncommon": return "uncommon";
			case "rare": return "rare";
			case "very rare": return "veryRare";
			case "legendary": return "legendary";
			case "artifact": return "artifact";
			default: return "";
		}
	}

	static _getWeaponAbility (item) {
		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;

		if (itemTypeAbv === Parser.ITM_TYP_ABV__AMMUNITION || itemTypeAbv === Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC) return "dex";
		else if (itemTypeAbv === Parser.ITM_TYP_ABV__RANGED_WEAPON) return "dex";
		else if ((item.property || []).some(uid => DataUtil.itemProperty.unpackUid(uid).abbreviation === Parser.ITM_PROP_ABV__FINESSE)) return "dex"; 
		return "str";
	}

		static _getBaseItem ({item, foundryType}) {
				
		let baseNameLower;
		let baseSourceLower;

		if (item.baseItem && typeof item.baseItem === "string") {
			let [name, source] = item.baseItem.toLowerCase().trim().split("|").map(it => it.trim());
			source = source || Parser.SRC_DMG.toLowerCase();

			baseNameLower = name;
			baseSourceLower = source;
		}

		if (item._baseName && item._baseSource) {
			baseNameLower = item._baseName.toLowerCase();
			baseSourceLower = item._baseSource.toLowerCase();
		}

				if (baseSourceLower !== Parser.SRC_PHB.toLowerCase() && baseSourceLower !== Parser.SRC_DMG.toLowerCase()) return null;

		switch (foundryType) {
			case UtilDocumentItem.TYPE_WEAPON: {
				const key = this._getWeaponIdKey({nameLower: baseNameLower});
				if (CONFIG.DND5E.weaponIds?.[key]) return key;
				break;
			}

			case UtilDocumentItem.TYPE_EQUIPMENT: {
				const key = this._getArmorShieldIdKey({nameLower: baseNameLower});
				if (CONFIG.DND5E.shieldIds?.[key] || CONFIG.DND5E.armorIds?.[key]) return key;
				break;
			}

			case UtilDocumentItem.TYPE_TOOL: {
				const key = this._getToolIdKey({nameLower: baseNameLower});
				if (CONFIG.DND5E.toolIds?.[key]) return key;
				break;
			}
		}

		return null;
	}

	static _getWeaponRange (item, {srdData} = {}) {
		let rangeShort = 0;
		let rangeLong = 0;
		let rangeUnits = "ft";

		if (srdData) {
			rangeShort = MiscUtil.get(srdData, "system", "range", "value");
			rangeLong = MiscUtil.get(srdData, "system", "range", "long");
			rangeUnits = MiscUtil.get(srdData, "system", "range", "units") || rangeUnits;
		} else if (item.range) {
			const cleanRange = `${item.range}`.trim();
			const mRangeLong = /^(\d+)\/(\d+)$/i.exec(cleanRange);
			if (mRangeLong) {
				rangeShort = Number(mRangeLong[1]);
				rangeLong = Number(mRangeLong[2]);
			}

			const mRangeNum = /^(\d+)$/i.exec(cleanRange);
			if (mRangeNum) rangeShort = Number(mRangeNum[1]);
		} else if ((item.property || []).some(uid => DataUtil.itemProperty.unpackUid(uid).abbreviation === Parser.ITM_PROP_ABV__REACH)) { 			rangeShort = 10;
		} else { 			rangeShort = 5;
		}

		return {rangeShort, rangeLong, rangeUnits};
	}

	static _getItemProperties (item) {
		const out = new Set(
			(item.property || [])
				.map(uid => DataConverterItem._ITEM_PROP_MAP[DataUtil.itemProperty.unpackUid(uid).abbreviation])
				.filter(Boolean),
		);

		if (item._variantName === "Adamantine Weapon" || item._variantName === "Adamantine Armor" || item._variantName === "Adamantine Ammunition") out.add("ada"); 		if (item.focus) out.add("foc"); 		if (!Renderer.item.isMundane(item)) out.add("mgc"); 		if (item._variantName === "Silvered Weapon" || item._variantName === "Silvered Ammunition") out.add("sil"); 		if (item.firearm) out.add("fir"); 		if (item.stealth) out.add("stealthDisadvantage");
		if (item.containerCapacity?.weightless) out.add("weightlessContents");

		return [...out]
			.sort(SortUtil.ascSortLower);
	}

	static _getItemSystemType ({item, foundryType}) {
		const out = {
			value: "",
			baseItem: "",
		};

		const itemType = item.bardingType || item.type;
		const itemTypeAbv = itemType ? DataUtil.itemType.unpackUid(itemType).abbreviation : null;

		switch (foundryType) {
			case UtilDocumentItem.TYPE_WEAPON: {
				out.value = this._pGetItemItem_getWeaponType(item);
				out.baseItem = this._getBaseItem({item, foundryType});
				return out;
			}

			case UtilDocumentItem.TYPE_EQUIPMENT: {
				out.value = DataConverterItem._ITEM_TYPE_TO_ARMOR_TYPE[itemTypeAbv] || "trinket";
				out.baseItem = this._getBaseItem({item, foundryType});
				return out;
			}

			case UtilDocumentItem.TYPE_TOOL: {
				out.value = DataConverterItem._ITEM_TYPE_TO_TOOL_TYPE[itemTypeAbv] ?? "";
				out.baseItem = this._getBaseItem({item, foundryType});
				return out;
			}

			case UtilDocumentItem.TYPE_CONSUMABLE: {
				out.value = (item.poison ? "poison" : DataConverterItem._ITEM_TYPE_TO_CONSUMABLE_TYPE[itemTypeAbv]) || "";

				const subtype = this._getItemSystemType_getConsumableSubtype({item, systemTypeValue: out.value});
				if (subtype != null) out.subtype = subtype;

				return out;
			}

			case UtilDocumentItem.TYPE_LOOT: {
				out.value = this._pGetItemItem_getLootType(item);
				return out;
			}

			case UtilDocumentItem.TYPE_CONTAINER: {
				return out;
			}

			default: throw new Error("Unimplemented!");
		}
	}

	static _getItemSystemType_getConsumableSubtype ({item, systemTypeValue}) {
		switch (systemTypeValue) {
			case "poison": {
				if (!item.poisonTypes?.length) return null;

				const poisonType = item.poisonTypes[0];
								if (CONFIG.DND5E.consumableTypes.poison.subtypes[poisonType]) return poisonType;

				return null;
			}

			case "ammo": {
				if (item.arrow) return "arrow";
				if (item.bolt) return "crossbowBolt";
				if (item.bulletSling) return "slingBullet";
				if (item.needleBlowgun) return "blowgunNeedle";
				return null;
			}
		}

		return null;
	}

	static _getWeaponDamageModifiersFromBonuses ({item}) {
		return [
			item.bonusWeapon,
			item.bonusWeaponDamage,
		]
			.filter(Boolean)
			.join("");
	}

	static _getWeaponDamageAndFormula ({item, entriesStr}) {
		
		const parts = [];
		let formula = "";

		if (item.dmg1) {
			const dmg1 = `${item.dmg1}${this._getWeaponDamageModifiersFromBonuses({item})}+@mod`;
			parts.push([
				dmg1,
				item.dmgType ? Parser.dmgTypeToFull(item.dmgType) : "",
			]);
		}

				const additionalMetas = [];
		entriesStr
			.replace(new RegExp(`(?:deals?|dealing|takes?) an extra {@(?:dice|damage) (?<dmg>[^}]+)}(?: (?<dmgType>${Parser.DMG_TYPES.join("|")}))? damage`, "g"), (...m) => {
				additionalMetas.push({
					dmg: m.last().dmg,
					dmgType: m.last().dmgType ? m.last().dmgType : "",
				});
			});

		if (Config.get("importItem", "isUseOtherFormulaFieldForExtraDamage")) {
			additionalMetas.forEach(({dmg, dmgType}) => {
				const op = formula && !/^[-+*/]/.test(dmg.trim()) ? " + " : "";
				formula += `${op}${dmg}${dmgType ? `[${dmgType}]` : ""}`;
			});
		} else {
			parts.push(...additionalMetas.map(({dmg, dmgType}) => [dmg, dmgType]));
		}
		
		const dmg2 = item.dmg2
			? `${item.dmg2}${this._getWeaponDamageModifiersFromBonuses({item})}+@mod`
			: "";

		return {
			damage: {
				parts,
				versatile: dmg2,
			},
			formula,
		};
	}

	static async _pGetItemItem_weapon (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_WEAPON;
		const systemType = this._getItemSystemType({item, foundryType});
		const weaponAbility = this._getWeaponAbility(item);
		const rangeMeta = this._getWeaponRange(item);
		const {weight, price, rangeShort, rangeLong, rangeUnits} = this._pGetItemItem_getWeightPriceRange(item, opts.size, rangeMeta);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);
		const {consumeType, consumeTarget, consumeAmount} = this._pGetItemItem_getAmmoConsumeDetails(item, opts);
		const itemProperties = this._getItemProperties(item);

		const {damage, formula} = this._getWeaponDamageAndFormula({item, entriesStr});

		const {uses, usesPer, usesRecovery} = this._getItemItem_getItemUses(item);
		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			proficient: opts.isProficient === undefined ? UtilItems.PROFICIENCY_LEVELS.AUTO : opts.isProficient,
			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			identified: isIdentified,
			equipped: opts.isEquipped ?? isEquipped,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,

			damage,
			range: {value: rangeShort, long: rangeLong, units: rangeUnits},
			ability: opts.ability ?? weaponAbility,
			properties: itemProperties,

			attunement,

			activation: {type: "action", cost: 1, condition: this._getItemItem_getActivationCondition({item, entriesStr})},
			duration: {value: 0, units: ""},
			target: this._getWeaponTargetDataDefault(),
			uses: {value: uses, max: uses, per: usesPer, recovery: usesRecovery},
			actionType: (item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null) === Parser.ITM_TYP_ABV__RANGED_WEAPON ? "rwak" : "mwak",
			attack: {
				bonus: item.bonusWeapon || item.bonusWeaponAttack || null,
			},
			chatFlavor: "",
			critical: {
				damage: item.bonusWeaponCritDamage ?? "",
				threshold: item.critThreshold ?? null,
			},

			formula,
			save: {ability: "", dc: 0, scaling: "spell"},
			consume: {type: consumeType, target: consumeTarget, amount: consumeAmount},

			hp: {value: 0, max: 0, dt: null, conditions: ""},
			speed: {value: null, conditions: ""},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static async _pGetItemItem_equipment (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_EQUIPMENT;
		const systemType = this._getItemSystemType({item, foundryType});
		const {weight, price} = this._pGetItemItem_getWeightPriceRange(item, opts.size);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);

		const {acValue, maxDexBonus} = UtilEntityItem.getAcInfo(item);

		const {uses, usesPer, usesRecovery} = this._getItemItem_getItemUses(item);

		const itemProperties = this._getItemProperties(item);

		const activationCondition = this._getItemItem_getActivationCondition({item, entriesStr});

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			proficient: opts.isProficient === undefined ? UtilItems.PROFICIENCY_LEVELS.AUTO : opts.isProficient,
			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			identified: isIdentified,
			equipped: opts.isEquipped ?? isEquipped,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,

			ability: opts.ability,
			properties: itemProperties,

			attunement,

			activation: {type: (activationCondition || uses || usesPer) ? "special" : "", cost: 0, condition: activationCondition},
			duration: {value: null, units: ""},
			target: {value: null, units: "", type: ""},
			range: {value: null, long: null, units: ""},
			uses: {value: uses, max: uses, per: usesPer, recovery: usesRecovery},
			actionType: "",
			attack: {bonus: null},
			chatFlavor: "",
			critical: {threshold: null, damage: ""},
			damage: {parts: [], versatile: ""},
			formula: "",
			save: {ability: "", dc: null, scaling: "spell"},
			armor: {
				value: acValue,
				dex: maxDexBonus,
			},
			strength: item.strength || null,
			consume: {type: "", target: null, amount: null},

			hp: {value: 0, max: 0, dt: null, conditions: ""},
			speed: {value: null, conditions: ""},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static async _pGetItemItem_container (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_CONTAINER;
		const systemType = this._getItemSystemType({item, foundryType});
		const {weight, price} = this._pGetItemItem_getWeightPriceRange(item, opts.size);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);
		const itemProperties = this._getItemProperties(item);

		const capacityValue = !item.containerCapacity
			? 0
			: item.containerCapacity.weight
				? item.containerCapacity.weight.reduce((a, b) => a + b, 0)
				: Math.max(...item.containerCapacity.item.map(itemToCount => Math.max(...Object.values(itemToCount))));

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			equipped: opts.isEquipped ?? isEquipped,
			identified: isIdentified,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,
			capacity: {
								type: item.containerCapacity?.weight ? "weight" : "items",
				value: capacityValue,
			},

			ability: opts.ability,
			properties: itemProperties,

			attunement,

			damage: {parts: []},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static async _pGetItemItem_consumable (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_CONSUMABLE;
		const systemType = this._getItemSystemType({item, foundryType});
		const {weight, price} = this._pGetItemItem_getWeightPriceRange(item, opts.size);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);

		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;

		let rollOnCons = "";
		let autoDestroy = false;

		entriesStr.replace(/if you expend[^.]+last charge[^.]+roll[^.]+{@dice ([^}]+)}(?:[^.]+)?\.(?:[^.]+)on a[^.]+\d+[^.]+destroyed/ig, (...m) => {
			rollOnCons = m[1];
			autoDestroy = true;
		});
		if (itemTypeAbv === Parser.ITM_TYP_ABV__SCROLL || itemTypeAbv === Parser.ITM_TYP_ABV__POTION) autoDestroy = true;

				const actionType = [Parser.ITM_TYP_ABV__AMMUNITION, Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC].includes(itemTypeAbv) ? "rwak" : null;
		let attackBonus = null;

		const dmgParts = [];
		if ([Parser.ITM_TYP_ABV__AMMUNITION, Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC].includes(itemTypeAbv) && (item.bonusWeapon || item.bonusWeaponDamage)) {
			attackBonus = Number(item.bonusWeapon || item.bonusWeaponAttack);

			dmgParts.push([
				this._getWeaponDamageModifiersFromBonuses({item}),
				null,
			]);
		}
		
		const {uses, usesPer, usesRecovery} = this._getItemItem_getItemUses(item);
		const itemProperties = this._getItemProperties(item);

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			equipped: opts.isEquipped ?? isEquipped,
			identified: isIdentified,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,

			ability: opts.ability,
			properties: itemProperties,

			attunement,

			activation: {type: "action", cost: 1, condition: this._getItemItem_getActivationCondition({item, entriesStr})},
			duration: {value: null, units: ""},
			target: {value: null, units: "", type: ""},
			range: {value: null, long: null, units: ""},
			uses: {value: uses, max: uses, per: usesPer, recovery: usesRecovery, autoUse: true, autoDestroy: autoDestroy},
			actionType,
			attack: {
				bonus: attackBonus,
			},
			chatFlavor: "",
			critical: {threshold: null, damage: ""},
			damage: {
				parts: dmgParts,
				versatile: "",
			},
			formula: rollOnCons, 			save: {ability: "", dc: null, scaling: "spell"},
			consume: {type: "", target: null, amount: null},
			hp: {value: 0, max: 0, dt: null, conditions: ""},
			speed: {value: null, conditions: ""},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static async _pGetItemItem_tool (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_TOOL;
		const systemType = this._getItemSystemType({item, foundryType});
		const {weight, price} = this._pGetItemItem_getWeightPriceRange(item, opts.size);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);
		const itemProperties = this._getItemProperties(item);

		let defaultAbil = DataConverterItem._ITEM_NAME_TO_DEFAULT_ABILITY[item.name] || "int";

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			equipped: opts.isEquipped ?? isEquipped,
			identified: isIdentified,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,

			proficient: opts.isProficient === undefined ? UtilItems.PROFICIENCY_LEVELS.AUTO : opts.isProficient,

			ability: opts.ability ?? defaultAbil,
			properties: itemProperties,

			attunement,

			chatFlavor: "",
			damage: {parts: []},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static async _pGetItemItem_loot (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_LOOT;
		const systemType = this._getItemSystemType({item, foundryType});
		const {weight, price} = this._pGetItemItem_getWeightPriceRange(item, opts.size);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);
		const itemProperties = this._getItemProperties(item);

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		//const img = await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});
		const img = null;
		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			equipped: opts.isEquipped ?? isEquipped,
			identified: isIdentified,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,

			ability: opts.ability,
			properties: itemProperties,

			attunement,

			damage: {parts: []},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static _pGetItemItem_getAmmoConsumeDetails (item, opts) {
		let consumeType = "";
		let consumeTarget = "";
		let consumeAmount = null;

		if (item.ammoType && !opts.isInfiniteAmmo) {
			consumeType = "ammo";
			consumeAmount = 1;

			if (opts.sheetItemsAmmo) {
				const [ammoTypeName, ammoTypeSource] = item.ammoType.toLowerCase().split("|").map(it => it.trim()).filter(Boolean);
				const cleanAmmoTypeSource = (ammoTypeSource || Parser.SRC_DMG).toLowerCase();
				const cleanAmmoTypeName = ammoTypeName.replace(/s+$/g, ""); 
				const ammoTypeItems = opts.sheetItemsAmmo.filter(sheetItem => {
					const cleanSheetItemName = sheetItem.name.toLowerCase().trim().replace(/s+$/g, ""); 					return cleanSheetItemName === cleanAmmoTypeName
						&& (
							!Config.get("import", "isStrictMatching")
							|| (UtilDocumentSource.getDocumentSource(sheetItem).source || "").toLowerCase() === cleanAmmoTypeSource
						);
				});

				if (ammoTypeItems.length) {
										consumeTarget = ammoTypeItems[0].id;
				}
			}
		}

		return {
			consumeType,
			consumeTarget,
			consumeAmount,
		};
	}

	static async _pGetItemEffects (item, img, opts) {
		opts = opts || {};

		if (!Config.get("importItem", "isAddActiveEffects")) return [];

		const importType = await this._pGetItemImporterType(item, opts);

		const sideDataSourceGenerated = new SideDataSourceGeneratedItem({
			ent: item,
			img,
			isEffectsDisabled: importType === UtilDocumentItem.TYPE_CONSUMABLE
				|| (opts.isEquipped != null && !opts.isEquipped),
		});

						const effectsSideTuples = await this._SideDataInterface.pGetEffectsSideLoadedTuples(
			{
				ent: item,
				img,
				actor: opts.actor,
			},
			{
				sideDataSourceGenerated,
				actorType: opts.actorType,
			},
		);

		return UtilActiveEffects.getEffectsMutDedupeId(effectsSideTuples.map(it => it.effect));
	}

	static _getGenericIdKey ({nameLower}) { return nameLower.replace(/[^a-z]+/g, ""); }
	static _getWeaponIdKey ({nameLower}) { return this._getGenericIdKey({nameLower}); }
	static _getArmorShieldIdKey ({nameLower}) { return DataConverterItem._ITEM_NAME_TO_ARMOR_ID_KEY[nameLower] || this._getGenericIdKey({nameLower}); }
	static _getToolIdKey ({nameLower}) { return DataConverterItem._ITEM_NAME_TO_TOOL_ID_KEY[nameLower] || this._getGenericIdKey({nameLower}); }

	static _getItemItem_getActivationCondition ({item, entriesStr}) {
		entriesStr = entriesStr || JSON.stringify(item.entries || "");

		let out = "";

		entriesStr.replace(/command word|command phrase/gi, (...m) => {
			out = m[0];
		});

		return out.uppercaseFirst();
	}

			static async pGetCurrencyItem (currency, opts) {
		opts = opts || {};

		const weight = Config.getMetricNumberWeight({configGroup: "importItem", originalValue: this._getCurrencyWeight(currency), originalUnit: Parser.UNT_LBS, toFixed: 3});
		const price = CurrencyUtil.getAsCopper(currency) / 100;

		const description = `<p>This collection of currency is made up of: ${Parser.getDisplayCurrency(currency)}</p>
		<hr class="hr-2">
		<p class="ve-muted italic">Drag-and-drop this item to an actor's sheet to add the currency to that actor.</p>`;

		const out = {
			...UtilFoundryId.getIdObj(),
			name: "Currency",
			type: "loot",
			system: {
				description: {value: description, chat: ""},

				type: {value: "treasure"},

				quantity: 1,
				weight,
				price,
			},
			img: "icons/commodities/currency/coins-assorted-mix-copper-silver-gold.webp",
			ownership: {default: 0},
			flags: {
				[SharedConsts.MODULE_ID]: {
					type: DataConverterItem.FLAG_TYPE__CURRENCY,
					currency: MiscUtil.copyFast(currency),
				},
			},
		};

		this._mutApplyDocOwnership(out, opts);

		return out;
	}

		static _getCurrencyWeight (currency) {
		return Object.entries(currency)
			.map(([coin, amount]) => 0.02 * (amount || 0))
			.reduce((a, b) => a + b, 0);
	}
	}

DataConverterItem._WEAPON_DETAIL_CACHE_INIT = false;
DataConverterItem._WEAPON_DETAIL_CACHE = {};
DataConverterItem._WEAPON_DETAIL_CACHE_LOCK = new VeLock();

DataConverterItem.STACKABLE_FOUNDRY_ITEM_TYPES_IMPORT = [
	UtilDocumentItem.TYPE_CONSUMABLE,
	UtilDocumentItem.TYPE_LOOT,
];

DataConverterItem._ITEM_TYPE_TO_ARMOR_TYPE = {
	[Parser.ITM_TYP_ABV__HEAVY_ARMOR]: "heavy",
	[Parser.ITM_TYP_ABV__MEDIUM_ARMOR]: "medium",
	[Parser.ITM_TYP_ABV__LIGHT_ARMOR]: "light",
	[Parser.ITM_TYP_ABV__SHIELD]: "shield",
};
DataConverterItem._ITEM_TYPE_TO_CONSUMABLE_TYPE = {
	[Parser.ITM_TYP_ABV__AMMUNITION]: "ammo",
	[Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC]: "ammo",
	[Parser.ITM_TYP_ABV__POTION]: "potion",
	[Parser.ITM_TYP_ABV__SCROLL]: "scroll",
	[Parser.ITM_TYP_ABV__WAND]: "wand",
	[Parser.ITM_TYP_ABV__ROD]: "rod",
};
DataConverterItem._ITEM_TYPE_TO_TOOL_TYPE = {
	[Parser.ITM_TYP_ABV__ARTISAN_TOOL]: "art",
	[Parser.ITM_TYP_ABV__INSTRUMENT]: "music",
	[Parser.ITM_TYP_ABV__GAMING_SET]: "game",
};
DataConverterItem._ITEM_NAME_TO_DEFAULT_ABILITY = {
	"Alchemist's Supplies": "int",
	"Brewer's Supplies": "int",
	"Calligrapher's Supplies": "int",
	"Carpenter's Tools": "int",
	"Cartographer's Tools": "int",
	"Cobbler's Tools": "int",
	"Cook's Utensils": "wis",
	"Disguise Kit": "cha",
	"Forgery Kit": "int",
	"Glassblower's Tools": "int",
	"Herbalism Kit": "wis",
	"Jeweler's Tools": "int",
	"Leatherworker's Tools": "int",
	"Mason's Tools": "int",
	"Navigator's Tools": "wis",
	"Painter's Supplies": "int",
	"Poisoner's Kit": "wis",
	"Potter's Tools": "int",
	"Smith's Tools": "int",
	"Thieves' Tools": "dex",
	"Tinker's Tools": "int",
	"Weaver's Tools": "int",
	"Woodcarver's Tools": "int",
};

DataConverterItem._ITEM_PROP_MAP = {
	[Parser.ITM_PROP_ABV__AMMUNITION]: "amm",
	[Parser.ITM_PROP_ABV__AMMUNITION_FUTURISTIC]: "amm",
	[Parser.ITM_PROP_ABV__BURST_FIRE]: "", 	[Parser.ITM_PROP_ABV__FINESSE]: "fin",
	[Parser.ITM_PROP_ABV__HEAVY]: "hvy",
	[Parser.ITM_PROP_ABV__LIGHT]: "lgt",
	[Parser.ITM_PROP_ABV__LOADING]: "lod",
	[Parser.ITM_PROP_ABV__REACH]: "rch",
	[Parser.ITM_PROP_ABV__RELOAD]: "rel",
	[Parser.ITM_PROP_ABV__SPECIAL]: "spc",
	[Parser.ITM_PROP_ABV__THROWN]: "thr",
	[Parser.ITM_PROP_ABV__TWO_HANDED]: "two",
	[Parser.ITM_PROP_ABV__VERSATILE]: "ver",
};
DataConverterItem._SIZE_TO_ITEM_WEIGHT_MULT = {
	[Parser.SZ_FINE]: 0.5,
	[Parser.SZ_DIMINUTIVE]: 0.5,
	[Parser.SZ_TINY]: 0.5,
	[Parser.SZ_SMALL]: 1,
	[Parser.SZ_MEDIUM]: 1,
	[Parser.SZ_LARGE]: 2,
	[Parser.SZ_HUGE]: 4,
	[Parser.SZ_GARGANTUAN]: 8,
	[Parser.SZ_COLOSSAL]: 16,
	[Parser.SZ_VARIES]: 1,
};
DataConverterItem._SIZE_TO_ITEM_VALUE_MULT = {
	[Parser.SZ_FINE]: 0.25,
	[Parser.SZ_DIMINUTIVE]: 0.25,
	[Parser.SZ_TINY]: 0.25,
	[Parser.SZ_SMALL]: 1,
	[Parser.SZ_MEDIUM]: 1,
	[Parser.SZ_LARGE]: 4,
	[Parser.SZ_HUGE]: 16,
	[Parser.SZ_GARGANTUAN]: 64,
	[Parser.SZ_COLOSSAL]: 256,
	[Parser.SZ_VARIES]: 1,
};
DataConverterItem._SIZE_TO_ITEM_WEIGHT_AND_VALUE_EXPONENT = {
	[Parser.SZ_FINE]: 0.5,
	[Parser.SZ_DIMINUTIVE]: 0.5,
	[Parser.SZ_TINY]: 0.5,
	[Parser.SZ_SMALL]: 1,
	[Parser.SZ_MEDIUM]: 1,
	[Parser.SZ_LARGE]: 2,
	[Parser.SZ_HUGE]: 3,
	[Parser.SZ_GARGANTUAN]: 4,
	[Parser.SZ_COLOSSAL]: 5,
	[Parser.SZ_VARIES]: 1,
};

DataConverterItem._ITEM_NAME_TO_ARMOR_ID_KEY = {
	"half plate armor": "halfplate",
	"hide armor": "hide",
	"leather armor": "leather",
	"padded armor": "padded",
	"plate armor": "plate",
	"splint armor": "splint",
	"studded leather armor": "studded",
};
DataConverterItem._ITEM_NAME_TO_TOOL_ID_KEY = {
	"alchemist's supplies": "alchemist",
	"brewer's supplies": "brewer",
	"calligrapher's supples": "calligrapher",
	"playing card set": "card",
	"carpenter's tools": "carpenter",
	"cartographer's tools": "cartographer",
	"dragonchess set": "chess",
	"cobbler's tools": "cobbler",
	"cook's utensils": "cook",
	"dice set": "dice",
	"disguise kit": "disg",
	"forgery kit": "forg",
	"glassblower's tools": "glassblower",
	"herbalism kit": "herb",
	"jeweler's tools": "jeweler",
	"leatherworker's tools": "leatherworker",
	"mason's tools": "mason",
	"navigator's tools": "navg",
	"painter's supplies": "painter",
	"poisoner's kit": "pois",
	"potter's tools": "potter",
	"smith's tools": "smith",
	"thieves' tools": "thief",
	"tinker's tools": "tinker",
	"weaver's tools": "weaver",
	"woodcarver's tools": "woodcarver",
};

DataConverterItem.FLAG_TYPE__CURRENCY = "currency";