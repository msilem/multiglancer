<template>
  <div class="views-edit-compact">
    <div class="row no-wrap items-center header-row text-caption text-grey-5 q-px-sm">
      <div class="col-auto" style="width: 28px;"></div>
      <div class="col" style="min-width: 60px;">Name</div>
      <div class="col-auto text-center" style="width: 52px;">W</div>
      <div class="col-auto text-center" style="width: 52px;">H</div>
      <div class="col-auto" style="width: 30px;"></div>
    </div>
    <template v-for="(view, i) in appState.views" :key="i">
      <div class="row no-wrap items-center view-row q-px-sm">
        <div class="col-auto" style="width: 28px;">
          <q-checkbox dense v-model="view.enabled" size="xs" />
        </div>
        <div class="col" style="min-width: 60px;">
          <q-input dense borderless v-model="view.name" input-class="text-body2" />
        </div>
        <div class="col-auto" style="width: 52px;">
          <q-input dense borderless type="number" v-model.number="view.width" input-class="text-center text-body2" />
        </div>
        <div class="col-auto" style="width: 52px;">
          <q-input dense borderless type="number" v-model.number="view.height" input-class="text-center text-body2" />
        </div>
        <div class="col-auto" style="width: 30px;">
          <q-btn dense flat round size="sm" icon="delete" color="negative" @click="delView(i)" />
        </div>
      </div>
    </template>
    <div class="row q-mt-sm q-px-sm q-gutter-sm">
      <q-btn dense icon="add" color="primary" @click="addView" label="Add" size="sm" />
      <q-btn dense @click="reset()" color="warning" label="Reset" size="sm" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { View } from 'src/models/views';
import { appState } from 'src/stores/appState';

const addView = () => {
  appState.value.views.push({ name: 'New', width: 800, height: 600, enabled: true, scale: 1, reloadKey: 0 } as View)
}

const delView = (i: number) => {
  appState.value.views.splice(i, 1)
}

const reset = () => {
  if (confirm('Are you sure you want to reset all config?')) {
    localStorage.clear()
    location.reload()
  }
}
</script>

<style scoped>
.views-edit-compact .view-row {
  min-height: 28px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.views-edit-compact .header-row {
  min-height: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.views-edit-compact :deep(.q-field__control),
.views-edit-compact :deep(.q-field__marginal) {
  min-height: 24px;
  height: 24px;
}
.views-edit-compact :deep(.q-field__native) {
  min-height: 24px;
  padding: 0;
}
.views-edit-compact :deep(.q-field) {
  padding: 0;
}
</style>
