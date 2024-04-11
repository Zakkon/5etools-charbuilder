class ImportListClass{
    //THIS IS A STUB
}

ImportListClass.Utils = class {
    static getDedupedData({ allContentMerged: allContentMerged }) {
      allContentMerged = MiscUtil.copy(allContentMerged);
      Object.entries(allContentMerged).forEach(([propName, value]) => {
        if (propName !== "class") {
          return;
        }
        if (!(value instanceof Array)) {
          return;
        }
        const contentHolder = [];
        const hashSet = new Set();
        value.forEach(obj => {
          const classHash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES](obj);
          if (hashSet.has(classHash)) {
            if (obj.subclasses?.length) {
              const existingClass = contentHolder.find(cls => UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES](cls) === classHash);
              (existingClass.subclasses = existingClass.subclasses || []).push(...obj.subclasses);
            }
            return;
          }
          hashSet.add(classHash);
          contentHolder.push(obj);
        });
        allContentMerged[propName] = contentHolder;
      });
      return allContentMerged;
    }
    static getBlocklistFilteredData({ dedupedAllContentMerged: dedupedAllContentMerged }) {
      dedupedAllContentMerged = { ...dedupedAllContentMerged};
      Object.entries(dedupedAllContentMerged).forEach(([propName, value]) => {
        if (propName !== 'class') { return; }
        if (!(value instanceof Array)) {
          return;
        }
        const filteredClasses = value.filter(obj => {
          if (obj.source === VeCt.STR_GENERIC) {
            return false;
          }
          return !ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER['class'](obj), 'class', obj.source, {
            'isNoCount': true
          });
        });
        filteredClasses.forEach(cls => {
          if (!cls.classFeatures) {
            return;
          }
          cls.classFeatures = cls.classFeatures.filter(f => !ExcludeUtil.isExcluded(f.hash, "classFeature", f.source, {
            'isNoCount': true
          }));
        });
        filteredClasses.forEach(cls => {
          if (!cls.subclasses) {
            return;
          }
          cls.subclasses = cls.subclasses.filter(sc => {
            if (sc.source === VeCt.STR_GENERIC) {
              return false;
            }
            return !ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER.subclass(sc), 'subclass', sc.source, {
              'isNoCount': true
            });
          });
          cls.subclasses.forEach(sc => {
            if (!sc.subclassFeatures) {
              return;
            }
            sc.subclassFeatures = sc.subclassFeatures.filter(f => !ExcludeUtil.isExcluded(f.hash, "subclassFeature", f.source, {
              'isNoCount': true
            }));
          });
        });
        dedupedAllContentMerged[propName] = filteredClasses;
      });
      return dedupedAllContentMerged;
    }
};

