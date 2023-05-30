import type { EntryProps, Link } from 'contentful-management';

import { isPrimitiveField, updatePrimitiveField, resolveReference } from '../helpers';
import {
  CollectionItem,
  SysProps,
  EntityReferenceMap,
  Entity,
  ASSET_TYPENAME,
  UpdateFieldProps,
  UpdateReferenceFieldProps,
  UpdateEntryProps,
  isAsset,
} from '../types';
import { updateAsset } from './assets';
import { buildCollectionName, logUnrecognizedFields } from './utils';

/**
 * Updates GraphQL response data based on CMA entry object
 *
 * @param contentType ContentTypeProps
 * @param dataFromPreviewApp Entity - The GraphQL response to be updated
 * @param updateFromEntryEditor EntryProps - CMA entry object containing the update
 * @param locale string - Locale code
 * @returns Entity - Updated GraphQL response data
 */
export async function updateEntry({
  contentType,
  dataFromPreviewApp,
  updateFromEntryEditor,
  locale,
  entityReferenceMap,
}: UpdateEntryProps): Promise<Entity & { sys: SysProps }> {
  if (dataFromPreviewApp.sys.id !== updateFromEntryEditor.sys.id) {
    return dataFromPreviewApp;
  }

  const copyOfDataFromPreviewApp = { ...dataFromPreviewApp };
  const { fields } = contentType;

  logUnrecognizedFields(
    fields.map((f) => f.apiName ?? f.name),
    dataFromPreviewApp
  );

  for (const field of fields) {
    const name = field.apiName ?? field.name;

    if (isPrimitiveField(field)) {
      updatePrimitiveField(copyOfDataFromPreviewApp, updateFromEntryEditor, name, locale);
    } else if (field.type === 'RichText') {
      updateRichTextField({
        dataFromPreviewApp: copyOfDataFromPreviewApp,
        updateFromEntryEditor,
        name,
        locale,
        entityReferenceMap,
      });
    } else if (field.type === 'Link') {
      await updateSingleRefField({
        dataFromPreviewApp: copyOfDataFromPreviewApp,
        updateFromEntryEditor,
        name,
        locale,
        entityReferenceMap,
      });
    } else if (field.type === 'Array' && field.items?.type === 'Link') {
      await updateMultiRefField({
        dataFromPreviewApp: copyOfDataFromPreviewApp,
        updateFromEntryEditor,
        name,
        locale,
        entityReferenceMap,
      });
    }
  }

  return copyOfDataFromPreviewApp;
}

type RichTextData = {
  json: {
    content: {
      content: Record<string, unknown>[];
      data: { target?: Link<'Entry'> | Link<'Asset'> };
      nodeType: string;
    }[];
    data: Record<string, unknown>;
    nodeType: string;
  };
  links?: {
    entries?: {
      block?: Record<string, unknown>[];
      inline?: Record<string, unknown>[];
    };
    assets?: {
      block?: Record<string, unknown>[];
      inline?: Record<string, unknown>[];
    };
  };
};

function formatResolvedRef(ref: { reference: EntryProps; typeName: string }, locale: string) {
  //TODO: also resolve nested references
  return {
    ...Object.entries(ref.reference.fields).map(([key, value]) => [key, value[locale]]),
    ...Object.entries(ref.reference.sys),
    __typename: ref.typeName,
  };
}

async function updateRichTextField({
  dataFromPreviewApp,
  updateFromEntryEditor,
  name,
  locale,
  entityReferenceMap,
}: UpdateFieldProps) {
  console.log({ dataFromPreviewApp, updateFromEntryEditor, name, entityReferenceMap });
  if (name in dataFromPreviewApp) {
    if (!dataFromPreviewApp[name]) {
      dataFromPreviewApp[name] = {};
    }
    const data = dataFromPreviewApp[name] as RichTextData;
    data.json = updateFromEntryEditor?.fields?.[name]?.[locale] ?? null;
    if (entityReferenceMap) {
      const blockEntries = {} as Record<string, { reference: EntryProps; typeName: string }>;
      const inlineEntries = {} as Record<string, unknown>;
      const blockAssets = {} as Record<string, unknown>;
      const inlineAssets = {} as Record<string, unknown>;
      // const embeddedRefs = {
      //   entries: {
      //     block: {

      //     },
      //     inline: {

      //     }
      //   },
      //   assets: {
      //     block: {},
      //     inline: {}
      //   }
      // } as any;
      data.json.content.forEach(async (node) => {
        switch (node.nodeType) {
          case 'embedded-entry-block': {
            const id = node.data.target?.sys.id || '';
            blockEntries[id] = await resolveReference({ entityReferenceMap, referenceId: id });
            break;
          }
          case 'embedded-entry-inline': {
            const id = node.data.target?.sys.id || '';
            inlineEntries[id] = await resolveReference({ entityReferenceMap, referenceId: id });
            break;
          }
          case 'embedded-asset-block': {
            const id = node.data.target?.sys.id || '';
            blockAssets[id] = await resolveReference({ entityReferenceMap, referenceId: id });
            break;
          }
          case 'embedded-asset-inline': {
            const id = node.data.target?.sys.id || '';
            inlineAssets[id] = await resolveReference({ entityReferenceMap, referenceId: id });
            break;
          }
        }
      });
      data.links = {};
      if (Object.keys(blockEntries).length) {
        console.log('enter');
        //TODO: not entering
        data.links.entries = {
          block: Object.values(blockEntries).map((ref) => formatResolvedRef(ref, locale)) as Record<
            string,
            unknown
          >[],
        };
      }
      console.log({ links: data.links, blockEntries });
      console.log('v2');
    }
  }
}

async function updateReferenceAssetField({
  referenceFromPreviewApp,
  updatedReference,
  entityReferenceMap,
  locale,
}: UpdateReferenceFieldProps) {
  const { reference } = await resolveReference({
    entityReferenceMap,
    referenceId: updatedReference.sys.id,
    isAsset: true,
  });

  return updateAsset(
    { ...referenceFromPreviewApp, ...updatedReference, __typename: ASSET_TYPENAME },
    reference,
    locale
  );
}

async function updateReferenceEntryField(
  referenceFromPreviewApp: (EntryProps & { __typename?: string }) | null | undefined,
  updatedReference: Entity & CollectionItem,
  entityReferenceMap: EntityReferenceMap,
  locale: string
) {
  const { reference, typeName } = await resolveReference({
    entityReferenceMap,
    referenceId: updatedReference.sys.id,
  });

  // If we have the typename of the updated reference, we can work with it
  const merged = {
    ...referenceFromPreviewApp,
    ...updatedReference,
    __typename: typeName,
  } as Entity & CollectionItem;

  // TODO: kind of duplication with line 46, check if we can combine them
  for (const key in reference.fields) {
    const value = reference.fields[key as keyof typeof reference.fields][locale];

    if (typeof value === 'object') {
      if (value.nodeType === 'document') {
        // richtext
        merged[key] = { json: value };
      }

      if (value.sys) {
        // single reference
        merged[key] = value;
        await updateSingleRefField({
          dataFromPreviewApp: merged,
          updateFromEntryEditor: reference,
          locale,
          entityReferenceMap,
          name: key,
        });
      }
    } else if (Array.isArray(value) && value[0]?.sys) {
      // multi references
      const name = buildCollectionName(key);
      merged[name] = { items: value };
      await updateMultiRefField({
        dataFromPreviewApp: merged,
        updateFromEntryEditor: reference,
        locale,
        entityReferenceMap,
        name: key,
      });
    } else {
      // primitive fields
      merged[key] = value;
    }
  }

  return merged;
}

async function updateReferenceField({
  referenceFromPreviewApp,
  updatedReference,
  entityReferenceMap,
  locale,
}: UpdateReferenceFieldProps) {
  if (!updatedReference) {
    return null;
  }

  // it's already in graphql format so we can return
  if (referenceFromPreviewApp && referenceFromPreviewApp.__typename) {
    return referenceFromPreviewApp;
  }

  if (updatedReference.__typename) {
    return updatedReference;
  }

  if (isAsset(updatedReference)) {
    return updateReferenceAssetField({
      referenceFromPreviewApp,
      updatedReference,
      entityReferenceMap,
      locale,
    });
  }

  return updateReferenceEntryField(
    referenceFromPreviewApp,
    updatedReference,
    entityReferenceMap,
    locale
  );
}

async function updateSingleRefField({
  dataFromPreviewApp,
  updateFromEntryEditor,
  name,
  locale,
  entityReferenceMap,
}: UpdateFieldProps) {
  if (name in dataFromPreviewApp) {
    dataFromPreviewApp[name] = await updateReferenceField({
      referenceFromPreviewApp: dataFromPreviewApp[name] as EntryProps & { __typename?: string },
      updatedReference: updateFromEntryEditor?.fields?.[name]?.[locale],
      entityReferenceMap: entityReferenceMap as EntityReferenceMap,
      locale,
    });
  }
}

async function updateMultiRefField({
  dataFromPreviewApp,
  updateFromEntryEditor,
  name,
  locale,
  entityReferenceMap,
}: UpdateFieldProps) {
  const fieldName = buildCollectionName(name);

  if (fieldName in dataFromPreviewApp) {
    const list = updateFromEntryEditor?.fields?.[name]?.[locale] ?? [];
    const dataFromPreviewAppItems = await Promise.all(
      list.map(async (updatedItem: Entity & CollectionItem) => {
        const itemFromPreviewApp = (
          dataFromPreviewApp[fieldName] as { items: CollectionItem[] }
        ).items.find((item) => item.sys.id === updatedItem.sys.id);

        const result = await updateReferenceField({
          referenceFromPreviewApp: itemFromPreviewApp as unknown as EntryProps & {
            __typename?: string;
          },
          updatedReference: updatedItem,
          entityReferenceMap: entityReferenceMap as EntityReferenceMap,
          locale,
        });

        return result;
      })
    );

    (dataFromPreviewApp[fieldName] as { items: CollectionItem[] }).items =
      dataFromPreviewAppItems.filter(Boolean);
  }
}
