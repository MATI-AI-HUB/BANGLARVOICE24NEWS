// TEMP PROBE - remove after diagnosis
(function () {
  'use strict';
  console.log('[probe] file evaluated at top level. typeof $app.onAfterBootstrap=' +
    typeof $app.onAfterBootstrap + ' onBeforeServe=' + typeof $app.onBeforeServe +
    ' onServe=' + typeof $app.onServe + ' dao=' + typeof $app.dao);

  if (typeof $app.onBeforeBootstrap === 'function') {
    $app.onBeforeBootstrap(function (e) {
      console.log('[probe] onBeforeBootstrap FIRED');
    });
  }
  if (typeof $app.onAfterBootstrap === 'function') {
    $app.onAfterBootstrap(function (e) {
      console.log('[probe] onAfterBootstrap FIRED');
    });
  }
  if (typeof $app.onBeforeServe === 'function') {
    $app.onBeforeServe(function (e) {
      console.log('[probe] onBeforeServe FIRED dao=' + (typeof $app.dao));
    });
  }
  if (typeof $app.onServe === 'function') {
    $app.onServe(function (e) {
      console.log('[probe] onServe FIRED dao=' + (typeof $app.dao));
    });
  }
  // Test onRecord* events (bound at load time, fired on requests)
  if (typeof $app.onRecordBeforeCreateRequest === 'function') {
    $app.onRecordBeforeCreateRequest(function (e) {
      console.log('[probe] onRecordBeforeCreateRequest FIRED col=' + e.collection.name);
    });
  }
  if (typeof $app.onRecordsListRequest === 'function') {
    $app.onRecordsListRequest(function (e) {
      console.log('[probe] onRecordsListRequest FIRED col=' + e.collection.name);
    });
  }
  if (typeof $app.onModelBeforeCreate === 'function') {
    $app.onModelBeforeCreate(function (e) {
      console.log('[probe] onModelBeforeCreate FIRED table=' + (e.model ? e.model.tableName() : '?'));
    });
  }
})();
