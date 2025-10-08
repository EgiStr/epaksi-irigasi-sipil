import { z } from 'zod'

// Helper function untuk preprocessing null values
const preprocessNull = (val) => {
  if (val === null || val === 'null' || val === '' || val === undefined) {
    return null
  }
  return val
}

// Helper function untuk preprocessing numeric null values  
const preprocessNumeric = (val) => {
  if (val === null || val === 'null' || val === '' || val === undefined) {
    return null
  }
  const num = Number(val)
  return isNaN(num) ? null : num
}

// Base schema untuk koordinat GeoJSON
const coordinateSchema = z.tuple([z.number(), z.number(), z.number().optional()])

// Schema untuk GeoJSON
const geoJSONSchema = z.object({
  type: z.enum(['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon']),
  coordinates: z.union([
    coordinateSchema, // Point
    z.array(coordinateSchema), // LineString
    z.array(z.array(coordinateSchema)), // Polygon, etc
    z.array(z.array(z.array(coordinateSchema))) // MultiPolygon
  ]),
  crs: z.object({
    type: z.literal('name'),
    properties: z.object({
      name: z.string()
    })
  }).optional()
})

// Schema untuk foto PAI
const photoSchema = z.object({
  id: z.string(),
  url: z.string().url().optional(),
  caption: z.string().optional(),
  data_uri: z.string().optional()
})

// Simple PAI Data Schema - fleksibel untuk semua jenis PAI
const simplePAIDataSchema = z.object({
  // Core fields yang selalu ada
  di: z.object({
    name: z.preprocess(preprocessNull, z.string()),
    area_ha: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    kode: z.preprocess(preprocessNull, z.string().optional())
  }),
  
  aset: z.object({
    jenis: z.preprocess(preprocessNull, z.string()),
    nama: z.preprocess(preprocessNull, z.string()),
    nomenklatur: z.preprocess(preprocessNull, z.string().optional())
  }),
  
  // Optional fields - bisa ada atau tidak tergantung jenis PAI
  subsystem: z.preprocess(preprocessNull, z.string().optional()),
  
  teknis: z.object({
    panjang_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    lebar_atas_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    lebar_bawah_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    tinggi_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    kemiringan: z.preprocess(preprocessNumeric, z.number().optional()),
    material: z.preprocess(preprocessNull, z.string().optional())
  }).optional(),
  
  operasional: z.object({
    status: z.preprocess(preprocessNull, z.string().optional()),
    tahun_pembangunan: z.preprocess(preprocessNumeric, z.number().min(1900).max(2100).optional()),
    catatan: z.preprocess(preprocessNull, z.string().optional())
  }).optional(),
  
  koordinat: z.object({
    latitude: z.preprocess(preprocessNumeric, z.number().min(-90).max(90).optional()),
    longitude: z.preprocess(preprocessNumeric, z.number().min(-180).max(180).optional())
  }).optional(),
  
  catatan: z.preprocess(preprocessNull, z.string().optional()),
  
  // Fields untuk saluran
  bangunan: z.object({
    hulu: z.preprocess(preprocessNull, z.string().optional()),
    hilir: z.preprocess(preprocessNull, z.string().optional())
  }).optional(),
  
  hidraulik: z.object({
    luas_areal_ha: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    q_desain_m3s: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    panjang_m: z.preprocess(preprocessNumeric, z.number().min(0).optional())
  }).optional(),
  
  pintu: z.object({
    jumlah: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    lebar_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    tinggi_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    tenaga: z.preprocess(preprocessNull, z.string().optional()),
    bahan: z.preprocess(preprocessNull, z.string().optional())
  }).optional(),
  
  tahun_dibangun: z.preprocess(preprocessNumeric, z.number().min(1900).max(2100).optional()),
  
  dimensi_desain: z.object({
    li_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    b_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    la_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    h_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    kemiringan: z.preprocess(preprocessNumeric, z.number().optional())
  }).optional(),
  
  dimensi_nyata: z.object({
    li_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    b_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    la_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    h_m: z.preprocess(preprocessNumeric, z.number().min(0).optional()),
    kemiringan: z.preprocess(preprocessNumeric, z.number().optional())
  }).optional(),
  
  // Fields untuk bangunan  
  saluran: z.object({
    nama: z.preprocess(preprocessNull, z.string().optional())
  }).optional()
}).passthrough() // Allow extra fields

// Schema untuk create PAI - simple dan fleksibel (photos managed separately)
export const createPAISchema = z.object({
  featureId: z.string().min(1, 'Feature ID diperlukan'),
  paiType: z.enum(['saluran', 'bangunan'], {
    required_error: 'Tipe PAI harus dipilih',
    invalid_type_error: 'Tipe PAI harus saluran atau bangunan'
  }),
  paiData: z.json(),
  // photos field removed - now managed separately via PhotoManager
})

// Schema untuk update PAI
export const updatePAISchema = createPAISchema.partial().extend({
  id: z.string().min(1, 'ID PAI diperlukan')
})

// Schema untuk query PAI
export const queryPAISchema = z.object({
  featureId: z.preprocess(
    (val) => val === null || val === 'null' || val === '' ? undefined : val,
    z.string().optional()
  ),
  paiType: z.preprocess(
    (val) => val === null || val === 'null' || val === '' ? undefined : val,
    z.enum(['saluran', 'bangunan']).optional()
  ),
  page: z.preprocess(
    (val) => val === null || val === 'null' || val === '' ? '1' : val,
    z.string().regex(/^\d+$/).default('1').transform(Number)
  ),
  limit: z.preprocess(
    (val) => val === null || val === 'null' || val === '' ? '20' : val,
    z.string().regex(/^\d+$/).default('20').transform(Number)
  ),
  latest: z.preprocess(
    (val) => val === null || val === 'null' || val === '' ? undefined : val,
    z.string().optional().transform(val => val === 'true')
  ),
  includeFeature: z.preprocess(
    (val) => val === null || val === 'null' || val === '' ? undefined : val,
    z.string().optional().transform(val => val === 'true')
  )
})

// Export sub-schemas untuk reuse
export {
  geoJSONSchema,
  photoSchema,
  simplePAIDataSchema as paiDataSchema
}