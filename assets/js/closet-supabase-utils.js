"use strict";

(function exposeClosetSupabaseUtils() {
  const {
    imageStorageConfig,
    imageStoragePath: providerImageStoragePath,
    isSupabaseStorage,
    normalizeImageLocator,
    remoteImageCacheKey,
    remoteImageFromRecord
  } = window.closetImageProviderUtils;

  function createClient(config, createClientFactory) {
    if (!config?.supabaseUrl || !config?.supabaseAnonKey) return null;
    if (!createClientFactory) throw new Error("Supabase client loader is missing.");
    return createClientFactory(config.supabaseUrl, config.supabaseAnonKey);
  }

  async function signInWithGoogle(supabase, redirectTo) {
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
  }

  async function signOut(supabase) {
    return supabase.auth.signOut();
  }

  function itemToRow(item, userId, options = {}) {
    const normalizeRating = options.normalizeRating;
    const hasUploadedImage = Boolean(item.primaryImageId || (item.imageIds || []).length);
    const rating = normalizeRating(item.rating);
    const normalizeImageUrl = window.closetImageStateUtils?.normalizeImageUrl || ((value) => value || "");
    const externalImageUrl = hasUploadedImage ? null : normalizeImageUrl(item.externalImageUrl) || null;

    return {
      id: item.id,
      user_id: userId,
      name: item.name,
      product_url: item.productUrl || null,
      memo: item.memo || null,
      parent_category: item.parentCategory || null,
      category: item.category || null,
      brand: item.brand || null,
      color: item.color || null,
      image_url: externalImageUrl,
      image_edit: item.externalImageEdit || {},
      size_label: item.sizeLabel || null,
      shoe_size: item.shoeSize || null,
      retail_price: item.retailPrice,
      purchase_price: item.purchasePrice,
      purchase_date: item.purchaseDate || null,
      owned: item.owned,
      rating,
      raw: {
        ...(item.raw || {}),
        rating,
        externalImageUrl,
        externalImageEdit: hasUploadedImage ? null : item.externalImageEdit || null
      },
      created_at: item.createdAt || new Date().toISOString(),
      updated_at: item.updatedAt || new Date().toISOString()
    };
  }

  function measurementRowsForItem(item, measurementByLabel) {
    return Object.entries(item.measurements || {}).map(([label, value], index) => {
      const definition = measurementByLabel.get(label);
      return {
        item_id: item.id,
        measurement_definition_id: definition?.id || null,
        custom_label: definition ? null : label,
        label,
        value,
        unit: definition?.unit || "cm",
        source: "manual",
        sort_order: index * 10
      };
    });
  }

  function remoteImageFromRow(image, signedUrl = "", options = {}) {
    return remoteImageFromRecord({
      ...image,
      storagePath: image.storage_path,
      storageProvider: image.storage_provider,
      storageBucket: image.storage_bucket
    }, signedUrl, imageStorageConfig(options.config));
  }

  function itemFromRow(row, options = {}) {
    const measurementsByItem = options.measurementsByItem;
    const remoteImages = options.remoteImages || [];
    const localImageState = options.localImageState || { imageIds: [], primaryImageId: null };
    const existing = options.existing || {};
    const normalizeColor = options.normalizeColor;
    const normalizeRating = options.normalizeRating;
    const normalizeImageEdit = options.normalizeImageEdit;
    const defaultImageEdit = options.defaultImageEdit;
    const cleanText = options.cleanText;
    const normalizeImageUrl = window.closetImageStateUtils?.normalizeImageUrl || cleanText;

    return {
      id: row.id,
      name: row.name || "",
      productUrl: row.product_url || "",
      memo: row.memo || "",
      parentCategory: row.parent_category || "",
      category: row.category || "",
      brand: row.brand || "",
      color: normalizeColor(row.color),
      sizeLabel: row.size_label || "",
      shoeSize: row.shoe_size || "",
      retailPrice: row.retail_price,
      purchasePrice: row.purchase_price,
      purchaseDate: row.purchase_date || "",
      owned: row.owned,
      rating: normalizeRating(row.rating ?? row.raw?.rating),
      measurements: Object.fromEntries((measurementsByItem.get(row.id) || [])
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((measure) => [measure.custom_label || measure.label, Number(measure.value)])),
      measurementsDirty: false,
      imageIds: localImageState.imageIds,
      primaryImageId: localImageState.primaryImageId,
      remoteImages,
      imagesDirty: false,
      externalImageUrl: normalizeImageUrl(row.image_url || row.raw?.externalImageUrl),
      externalImageEdit: normalizeImageEdit(row.image_edit || row.raw?.externalImageEdit || existing.externalImageEdit || defaultImageEdit()),
      source: existing.source || "supabase",
      raw: row.raw || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function imageStoragePath(userId, itemId, imageId) {
    return providerImageStoragePath(userId, itemId, imageId);
  }

  function imageRow(image, item, userId, storagePath, options = {}) {
    const locator = normalizeImageLocator({
      storagePath,
      storageProvider: image.storageProvider,
      storageBucket: image.storageBucket
    }, imageStorageConfig(options.config));

    return {
      id: image.id,
      item_id: item.id,
      owner_id: userId,
      storage_provider: locator.storageProvider,
      storage_bucket: locator.storageBucket,
      storage_path: locator.storagePath,
      width: image.width || null,
      height: image.height || null,
      mime: image.mime || "image/webp",
      is_primary: image.id === item.primaryImageId
    };
  }

  function isMissingRelationError(error) {
    return error?.code === "42P01" || error?.code === "PGRST205" || /relation .*colors.* does not exist/i.test(error?.message || "");
  }

  function isMissingRatingColumnError(error) {
    return error?.code === "PGRST204" && /rating/i.test(error?.message || "");
  }

  function isMissingImageProviderColumnError(error) {
    return error?.code === "PGRST204" && /storage_provider|storage_bucket/i.test(error?.message || "");
  }

  function legacyImageRow(row) {
    const { storage_provider, storage_bucket, ...legacy } = row;
    return legacy;
  }

  function chunk(values, size) {
    const chunks = [];
    for (let index = 0; index < values.length; index += size) {
      chunks.push(values.slice(index, index + size));
    }
    return chunks;
  }

  async function deleteQuery(query, options = {}) {
    const { error } = await query;
    if (!error) return;
    if (options.ignoreMissingRelation && isMissingRelationError(error)) return;
    throw error;
  }

  async function upsertItem(supabase, row) {
    const { error } = await supabase.from("items").upsert(row);
    if (!error) return { ratingColumnAvailable: true };

    if (isMissingRatingColumnError(error) && "rating" in row) {
      delete row.rating;
      const { error: retryError } = await supabase.from("items").upsert(row);
      if (retryError) throw retryError;
      return { ratingColumnAvailable: false };
    }

    throw error;
  }

  async function replaceMeasurements(supabase, item, measurementByLabel) {
    await supabase.from("item_measurements").delete().eq("item_id", item.id);
    const measurements = measurementRowsForItem(item, measurementByLabel);

    if (measurements.length) {
      const { error } = await supabase.from("item_measurements").insert(measurements);
      if (error) throw error;
    }
  }

  async function ensureCategoryRowsForItem(supabase, item, userId, options = {}) {
    const parentName = options.cleanText(item.parentCategory);
    if (!parentName) return;

    const parent = await findOrCreateCategory(supabase, options.categoryCache, parentName, null, userId);
    const childName = options.cleanText(item.category);
    if (childName) {
      await findOrCreateCategory(supabase, options.categoryCache, childName, parent?.id || null, userId);
    }
  }

  async function findOrCreateCategory(supabase, categoryCache, name, parentId, userId) {
    const cacheKey = `${userId}:${parentId || "root"}:${name.toLocaleLowerCase("ko-KR")}`;
    const cached = categoryCache.get(cacheKey);
    if (cached) return cached;

    let query = supabase
      .from("categories")
      .select("id")
      .eq("name", name)
      .limit(1);

    query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

    const { data, error } = await query;
    if (error) throw error;
    if (data?.[0]) {
      categoryCache.set(cacheKey, data[0]);
      return data[0];
    }

    const { data: inserted, error: insertError } = await supabase
      .from("categories")
      .insert({
        owner_id: userId,
        parent_id: parentId,
        name,
        is_system: false
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    categoryCache.set(cacheKey, inserted);
    return inserted;
  }

  async function findOrCreateColor(supabase, colorCache, name, userId) {
    const cacheKey = `${userId}:${name.toLocaleLowerCase("ko-KR")}`;
    const cached = colorCache.get(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from("colors")
      .select("id")
      .eq("name", name)
      .limit(1);

    if (error) throw error;
    if (data?.[0]) {
      colorCache.set(cacheKey, data[0]);
      return data[0];
    }

    const { data: inserted, error: insertError } = await supabase
      .from("colors")
      .insert({
        owner_id: userId,
        name,
        is_system: false
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    colorCache.set(cacheKey, inserted);
    return inserted;
  }

  async function fetchColorRows(supabase) {
    const { data, error } = await supabase
      .from("colors")
      .select("name")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!error) return data || [];
    if (isMissingRelationError(error)) {
      console.warn("colors table is not available yet. Run supabase/schema.sql to persist custom color options.", error);
      return [];
    }
    throw error;
  }

  async function fetchMeasurementDefinitions(supabase) {
    const { data, error } = await supabase.from("measurement_definitions").select("*");
    if (error) throw error;
    return data || [];
  }

  async function uploadItemImages(supabase, item, userId, images) {
    if (!images.length) return { uploadedImages: [], itemImagesDirty: item.imagesDirty };
    const hasImageChanges = Boolean(item.imagesDirty || images.some((image) => !image.storagePath || image.needsUpload));
    if (!hasImageChanges) return { uploadedImages: [], itemImagesDirty: item.imagesDirty };
    const storageConfig = imageStorageConfig();
    if (!isSupabaseStorage(storageConfig)) {
      throw new Error(`Image storage provider "${storageConfig.provider}" is not implemented in this runtime.`);
    }

    const { error: primaryResetError } = await supabase
      .from("item_images")
      .update({ is_primary: false })
      .eq("item_id", item.id);
    if (primaryResetError) throw primaryResetError;

    const uploadedImages = [];

    for (const image of images) {
      const storagePath = image.storagePath || imageStoragePath(userId, item.id, image.id);
      const locator = normalizeImageLocator(image.storagePath ? image : { ...image, storagePath }, storageConfig);
      const shouldUpload = !image.storagePath || image.needsUpload;
      if (shouldUpload) {
        const { error: uploadError } = await supabase.storage
          .from(locator.storageBucket)
          .upload(locator.storagePath, image.blob, {
            contentType: image.mime || image.blob.type || "image/webp",
            upsert: true
          });
        if (uploadError) throw uploadError;
      }

      const nextImageRow = imageRow(image, item, userId, locator.storagePath);
      const { error: imageError } = await supabase.from("item_images").upsert(nextImageRow);
      if (imageError) {
        if (!isMissingImageProviderColumnError(imageError)) throw imageError;
        const { error: retryError } = await supabase.from("item_images").upsert(legacyImageRow(nextImageRow));
        if (retryError) throw retryError;
      }

      if (shouldUpload || !image.storagePath || image.needsUpload) {
        uploadedImages.push({
          ...image,
          storagePath: locator.storagePath,
          storageProvider: locator.storageProvider,
          storageBucket: locator.storageBucket,
          needsUpload: false
        });
      }
    }

    return { uploadedImages, itemImagesDirty: false };
  }

  async function fetchPullData(supabase, options = {}) {
    const since = options.since || "";
    const incremental = Boolean(since);
    const pulledAt = new Date().toISOString();

    let itemQuery = supabase
      .from("items")
      .select("*")
      .order("updated_at", { ascending: false });

    if (incremental) {
      itemQuery = itemQuery.gt("updated_at", since);
    }

    const { data: itemRows, error: itemError } = await itemQuery;
    if (itemError) throw itemError;

    const changedItemIds = (itemRows || []).map((row) => row.id);
    const definitionPromise = incremental
      ? Promise.resolve({ data: null, error: null })
      : supabase.from("measurement_definitions").select("*");
    const measurePromise = !incremental
      ? supabase.from("item_measurements").select("*")
      : !changedItemIds.length
        ? Promise.resolve({ data: [], error: null })
        : supabase
          .from("item_measurements")
          .select("*")
          .in("item_id", changedItemIds);
    const imagePromise = !incremental
      ? supabase.from("item_images").select("*").order("created_at", { ascending: false })
      : !changedItemIds.length
        ? Promise.resolve({ data: [], error: null })
        : supabase
          .from("item_images")
          .select("*")
          .in("item_id", changedItemIds)
          .order("created_at", { ascending: false });
    const colorPromise = incremental ? Promise.resolve([]) : fetchColorRows(supabase);

    const [{ data: definitionRows, error: definitionError }, { data: measureRows, error: measureError }, { data: imageRows, error: imageError }, colorRows] =
      await Promise.all([definitionPromise, measurePromise, imagePromise, colorPromise]);

    if (definitionError) throw definitionError;
    if (measureError) throw measureError;
    if (imageError) throw imageError;

    return {
      changedItemIds,
      colorRows: colorRows || [],
      definitionRows: definitionRows || [],
      imageRows: imageRows || [],
      incremental,
      itemRows: itemRows || [],
      measureRows: measureRows || [],
      pulledAt
    };
  }

  async function createSignedImageUrlMap(supabase, imageRows) {
    const signedUrlByPath = new Map();
    const rowsByBucket = new Map();
    const storageConfig = imageStorageConfig();

    for (const image of imageRows || []) {
      const locator = normalizeImageLocator({
        storagePath: image.storage_path,
        storageProvider: image.storage_provider,
        storageBucket: image.storage_bucket
      }, storageConfig);
      if (!locator.storagePath || !isSupabaseStorage(locator)) continue;
      if (!rowsByBucket.has(locator.storageBucket)) rowsByBucket.set(locator.storageBucket, []);
      rowsByBucket.get(locator.storageBucket).push({ image, locator });
    }

    for (const [bucket, rows] of rowsByBucket.entries()) {
      const paths = window.closetFormatUtils.uniqueValues(rows.map((entry) => entry.locator.storagePath));
      if (!paths.length) continue;

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(paths, storageConfig.signedUrlExpiresInSeconds);

      if (error) {
        console.warn("Signed image URLs could not be created", error);
        continue;
      }

      (data || []).forEach((entry) => {
        if (!entry?.path || !entry?.signedUrl) return;
        const row = rows.find((candidate) => candidate.locator.storagePath === entry.path);
        signedUrlByPath.set(entry.path, entry.signedUrl);
        if (row) signedUrlByPath.set(remoteImageCacheKey(row.locator), entry.signedUrl);
      });
    }

    return signedUrlByPath;
  }

  async function deleteItem(supabase, itemId) {
    await supabase.from("items").delete().eq("id", itemId);
  }

  async function deleteImage(supabase, imageId, storageLocator = "") {
    const locator = normalizeImageLocator(typeof storageLocator === "string" ? { storagePath: storageLocator } : storageLocator);
    if (locator.storagePath && isSupabaseStorage(locator)) {
      const { error: storageError } = await supabase.storage
        .from(locator.storageBucket)
        .remove([locator.storagePath]);
      if (storageError) throw storageError;
    }

    const { error } = await supabase.from("item_images").delete().eq("id", imageId);
    if (error) throw error;
  }

  async function fetchOwnedImageLocators(supabase, userId) {
    const { data, error } = await supabase
      .from("item_images")
      .select("id, storage_provider, storage_bucket, storage_path")
      .eq("owner_id", userId);

    if (!error) return data || [];

    if (isMissingImageProviderColumnError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("item_images")
        .select("id, storage_path")
        .eq("owner_id", userId);
      if (legacyError) throw legacyError;
      return legacyData || [];
    }

    throw error;
  }

  async function removeStorageObjects(supabase, imageRows) {
    const storageConfig = imageStorageConfig();
    const pathsByBucket = new Map();

    for (const row of imageRows || []) {
      const locator = normalizeImageLocator({
        storagePath: row.storage_path,
        storageProvider: row.storage_provider,
        storageBucket: row.storage_bucket
      }, storageConfig);
      if (!locator.storagePath || !isSupabaseStorage(locator)) continue;
      if (!pathsByBucket.has(locator.storageBucket)) pathsByBucket.set(locator.storageBucket, []);
      pathsByBucket.get(locator.storageBucket).push(locator.storagePath);
    }

    for (const [bucket, paths] of pathsByBucket.entries()) {
      const uniquePaths = window.closetFormatUtils.uniqueValues(paths);
      for (const pathChunk of chunk(uniquePaths, 100)) {
        const { error } = await supabase.storage.from(bucket).remove(pathChunk);
        if (error) throw error;
      }
    }
  }

  async function deleteAllWardrobeData(supabase, userId) {
    const imageRows = await fetchOwnedImageLocators(supabase, userId);
    await removeStorageObjects(supabase, imageRows);

    await deleteQuery(supabase.from("share_snapshots").delete().eq("owner_id", userId), { ignoreMissingRelation: true });
    await deleteQuery(supabase.from("item_images").delete().eq("owner_id", userId), { ignoreMissingRelation: true });
    await deleteQuery(supabase.from("items").delete().eq("user_id", userId), { ignoreMissingRelation: true });
    await deleteQuery(supabase.from("categories").delete().eq("owner_id", userId).eq("is_system", false), { ignoreMissingRelation: true });
    await deleteQuery(supabase.from("colors").delete().eq("owner_id", userId).eq("is_system", false), { ignoreMissingRelation: true });
    await deleteQuery(supabase.from("measurement_definitions").delete().eq("owner_id", userId).eq("is_system", false), { ignoreMissingRelation: true });
  }

  async function requestAccountDeletion(supabase, { userId, email, note } = {}) {
    const { data: existing, error: existingError } = await supabase
      .from("account_deletion_requests")
      .select("id, status, requested_at")
      .eq("user_id", userId)
      .in("status", ["requested", "processing"])
      .limit(1);

    if (existingError) throw existingError;
    if (existing?.[0]) return { alreadyRequested: true, request: existing[0] };

    const { data, error } = await supabase
      .from("account_deletion_requests")
      .insert({
        user_id: userId,
        requester_email: email || null,
        note: note || null,
        status: "requested"
      })
      .select("id, status, requested_at")
      .single();

    if (error) throw error;
    return { alreadyRequested: false, request: data };
  }

  window.closetSupabaseUtils = {
    createClient,
    createSignedImageUrlMap,
    deleteAllWardrobeData,
    deleteImage,
    deleteItem,
    ensureCategoryRowsForItem,
    fetchColorRows,
    fetchMeasurementDefinitions,
    fetchPullData,
    findOrCreateColor,
    imageRow,
    imageStoragePath,
    isMissingRatingColumnError,
    isMissingRelationError,
    itemFromRow,
    itemToRow,
    measurementRowsForItem,
    remoteImageFromRow,
    replaceMeasurements,
    requestAccountDeletion,
    signInWithGoogle,
    signOut,
    uploadItemImages,
    upsertItem
  };
})();
