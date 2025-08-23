export interface SpeciesTaxonomy {
  species_id: string;
  canonical_name: string;
  common_name: string;
  family: string;
  genus: string;
}

export interface Synonym {
  name: string;
  maps_to_species_id: string;
}

export interface INatTaxon {
  species_id: string;
  taxon_id: number;
  rank: string;
  matched_name: string;
  exact_match: boolean;
}

export interface MediaCandidate {
  source: 'inaturalist' | 'commons' | 'gbif';
  full_url: string;
  thumb_url?: string;
  original_page: string;
  author: string;
  license: string;
  license_url: string;
  width?: number;
  height?: number;
  score?: number;
  content_hash?: string;
  metadata?: Record<string, any>;
  taxon_id?: number; // For tracking which taxon this image belongs to
}

export interface SpeciesImages {
  species_id: string;
  canonical_name: string;
  images: MediaCandidate[];
  hero_index: number;
}

export interface ImageSeedingConfig {
  allowed_licenses: string[];
  disallowed_licenses: string[];
  concurrency: Record<string, number>;
  rate_limits: Record<string, {
    requests_per_minute: number;
    delay_between_requests: number;
  }>;
  image_requirements: {
    min_dimension: number;
    desired_per_species: number;
    max_per_source_per_species: Record<string, number>;
  };
  scoring: {
    source_weights: Record<string, number>;
    dimension_boost: number;
    faves_boost: number;
  };
  cache: {
    enable_disk_caching: boolean;
    cache_ttl_hours: number;
    download_images: boolean;
    image_formats: string[];
  };
}

export interface QAResults {
  coverage: {
    total_species: number;
    species_with_0_images: number;
    species_with_1_images: number;
    species_with_2_images: number;
    species_with_3_plus_images: number;
  };
  license_compliance: {
    cc0_count: number;
    cc_by_count: number;
    cc_by_sa_count: number;
    disallowed_count: number;
    unknown_count: number;
  };
  validation: {
    schema_valid: boolean;
    broken_links: number;
    total_images: number;
    average_dimensions: {
      width: number;
      height: number;
    };
  };
  errors: {
    taxon_errors: string[];
    download_errors: string[];
    api_errors: string[];
  };
}

export interface PipelineStats {
  startTime: Date;
  endTime?: Date;
  speciesProcessed: number;
  imagesHarvested: number;
  imagesSelected: number;
  errors: string[];
  warnings: string[];
}
