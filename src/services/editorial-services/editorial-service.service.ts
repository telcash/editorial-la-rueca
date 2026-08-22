import 'server-only';

import * as editorialServiceRepository from '@/repositories/editorial-services/editorial-service.repository';
import { createEditorialServiceService } from './editorial-service.service.core';

export { createEditorialServiceService } from './editorial-service.service.core';
export type {
  EditorialServiceAdminListOptions,
  EditorialServicePublicItem,
  EditorialServiceRepository,
} from './editorial-service.types';

const editorialServiceService = createEditorialServiceService(editorialServiceRepository);

export const {
  getServiceById,
  getServiceBySlug,
  listServices,
  listServicesPaginated,
  listActiveServices,
  listArchivedServices,
  listPublishedServices,
  createService,
  updateService,
  archiveService,
  restoreService,
} = editorialServiceService;
