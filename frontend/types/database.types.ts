
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ads": {
                  Row: {
                    "clicks": number,"created_at": string,"html_code": string | null,"id": string,"image_url": string | null,"impressions": number,"is_active": boolean,"link_url": string | null,"placement_key": string,"revenue_bdt": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clicks"?: number,"created_at"?: string,"html_code"?: string | null,"id"?: string,"image_url"?: string | null,"impressions"?: number,"is_active"?: boolean,"link_url"?: string | null,"placement_key": string,"revenue_bdt"?: number,"title": string
                  }
                  Update: {
                    "clicks"?: number,"created_at"?: string,"html_code"?: string | null,"id"?: string,"image_url"?: string | null,"impressions"?: number,"is_active"?: boolean,"link_url"?: string | null,"placement_key"?: string,"revenue_bdt"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_audit_log": {
                  Row: {
                    "cost_usd": number | null,"created_at": string | null,"error_message": string | null,"id": string,"input_tokens": number | null,"latency_ms": number | null,"model": string,"output_tokens": number | null,"prompt_version": string | null,"provider": string,"status": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cost_usd"?: number | null,"created_at"?: string | null,"error_message"?: string | null,"id"?: string,"input_tokens"?: number | null,"latency_ms"?: number | null,"model": string,"output_tokens"?: number | null,"prompt_version"?: string | null,"provider": string,"status"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "cost_usd"?: number | null,"created_at"?: string | null,"error_message"?: string | null,"id"?: string,"input_tokens"?: number | null,"latency_ms"?: number | null,"model"?: string,"output_tokens"?: number | null,"prompt_version"?: string | null,"provider"?: string,"status"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"api_vault": {
                  Row: {
                    "created_at": string,"environment": Database["public"]['Enums']["vault_env"],"id": string,"is_active": boolean,"key_encrypted": string | null,"last_tested": string | null,"service_name": string,"updated_at": string,"usage_percent": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"environment"?: Database["public"]['Enums']["vault_env"],"id"?: string,"is_active"?: boolean,"key_encrypted"?: string | null,"last_tested"?: string | null,"service_name": string,"updated_at"?: string,"usage_percent"?: number
                  }
                  Update: {
                    "created_at"?: string,"environment"?: Database["public"]['Enums']["vault_env"],"id"?: string,"is_active"?: boolean,"key_encrypted"?: string | null,"last_tested"?: string | null,"service_name"?: string,"updated_at"?: string,"usage_percent"?: number
                  }
                  Relationships: [
                    
                  ]
                },"articles": {
                  Row: {
                    "ai_confidence": number | null,"ai_model": string,"author_id": string | null,"canonical_url": string | null,"category": string,"category_key": string,"claims": NonNullable<Json>,"content_bn": string,"content_en": string,"content_hash": string,"context_blocks": NonNullable<Json>,"created_at": string,"editorial_status": string,"excerpt_bn": string,"fact_sources": NonNullable<Json>,"featured_image": string,"field_report_id": string | null,"human_verified": boolean,"id": string,"image_alt_bn": string,"image_credit": string,"image_is_representational": boolean,"image_license": string,"is_fallback": boolean,"is_premium": boolean,"media_type": string,"origin": string,"published_at": string | null,"review_reason": string | null,"risk_level": string,"source_id": string | null,"source_language": string,"source_name": string,"source_published_at": string | null,"source_type": string,"source_url": string | null,"status": string,"thumbnail_url": string,"title_bn": string,"title_en": string,"updated_at": string,"verification_status": string,"video_generated_at": string | null,"video_id": string | null,"workflow_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_confidence"?: number | null,"ai_model"?: string,"author_id"?: string | null,"canonical_url"?: string | null,"category"?: string,"category_key"?: string,"claims"?: NonNullable<Json>,"content_bn"?: string,"content_en"?: string,"content_hash"?: string,"context_blocks"?: NonNullable<Json>,"created_at"?: string,"editorial_status"?: string,"excerpt_bn"?: string,"fact_sources"?: NonNullable<Json>,"featured_image"?: string,"field_report_id"?: string | null,"human_verified"?: boolean,"id"?: string,"image_alt_bn"?: string,"image_credit"?: string,"image_is_representational"?: boolean,"image_license"?: string,"is_fallback"?: boolean,"is_premium"?: boolean,"media_type"?: string,"origin"?: string,"published_at"?: string | null,"review_reason"?: string | null,"risk_level"?: string,"source_id"?: string | null,"source_language"?: string,"source_name"?: string,"source_published_at"?: string | null,"source_type"?: string,"source_url"?: string | null,"status"?: string,"thumbnail_url"?: string,"title_bn": string,"title_en"?: string,"updated_at"?: string,"verification_status"?: string,"video_generated_at"?: string | null,"video_id"?: string | null,"workflow_status"?: string
                  }
                  Update: {
                    "ai_confidence"?: number | null,"ai_model"?: string,"author_id"?: string | null,"canonical_url"?: string | null,"category"?: string,"category_key"?: string,"claims"?: NonNullable<Json>,"content_bn"?: string,"content_en"?: string,"content_hash"?: string,"context_blocks"?: NonNullable<Json>,"created_at"?: string,"editorial_status"?: string,"excerpt_bn"?: string,"fact_sources"?: NonNullable<Json>,"featured_image"?: string,"field_report_id"?: string | null,"human_verified"?: boolean,"id"?: string,"image_alt_bn"?: string,"image_credit"?: string,"image_is_representational"?: boolean,"image_license"?: string,"is_fallback"?: boolean,"is_premium"?: boolean,"media_type"?: string,"origin"?: string,"published_at"?: string | null,"review_reason"?: string | null,"risk_level"?: string,"source_id"?: string | null,"source_language"?: string,"source_name"?: string,"source_published_at"?: string | null,"source_type"?: string,"source_url"?: string | null,"status"?: string,"thumbnail_url"?: string,"title_bn"?: string,"title_en"?: string,"updated_at"?: string,"verification_status"?: string,"video_generated_at"?: string | null,"video_id"?: string | null,"workflow_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "articles_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_field_report_id_fkey"
      columns: ["field_report_id"]
isOneToOne: false
      referencedRelation: "field_reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "news_sources"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"detail": NonNullable<Json>,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"detail"?: NonNullable<Json>,"id"?: string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"detail"?: NonNullable<Json>,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"breaking_ticker": {
                  Row: {
                    "created_at": string,"id": number,"is_active": boolean,"text_bn": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: number,"is_active"?: boolean,"text_bn"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: number,"is_active"?: boolean,"text_bn"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"epaper_editions": {
                  Row: {
                    "article_count": number,"created_at": string,"edition_date": string,"html": string,"id": string,"pages": NonNullable<Json>,"pdf_url": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_count"?: number,"created_at"?: string,"edition_date": string,"html": string,"id"?: string,"pages"?: NonNullable<Json>,"pdf_url"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "article_count"?: number,"created_at"?: string,"edition_date"?: string,"html"?: string,"id"?: string,"pages"?: NonNullable<Json>,"pdf_url"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"field_reports": {
                  Row: {
                    "ai_duplicate_of": string | null,"ai_score": number | null,"ai_summary": string,"ai_transcript": string,"ai_translation_en": string,"captured_at": string | null,"created_at": string,"description": string,"id": string,"lat": number | null,"lng": number | null,"location": string,"media_urls": (string)[],"reporter_id": string,"status": Database["public"]['Enums']["report_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_duplicate_of"?: string | null,"ai_score"?: number | null,"ai_summary"?: string,"ai_transcript"?: string,"ai_translation_en"?: string,"captured_at"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"lat"?: number | null,"lng"?: number | null,"location"?: string,"media_urls"?: (string)[],"reporter_id": string,"status"?: Database["public"]['Enums']["report_status"],"title"?: string,"updated_at"?: string
                  }
                  Update: {
                    "ai_duplicate_of"?: string | null,"ai_score"?: number | null,"ai_summary"?: string,"ai_transcript"?: string,"ai_translation_en"?: string,"captured_at"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"lat"?: number | null,"lng"?: number | null,"location"?: string,"media_urls"?: (string)[],"reporter_id"?: string,"status"?: Database["public"]['Enums']["report_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "field_reports_ai_duplicate_of_fkey"
      columns: ["ai_duplicate_of"]
isOneToOne: false
      referencedRelation: "field_reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "field_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"live_sessions": {
                  Row: {
                    "created_at": string,"ended_at": string | null,"id": string,"rtmp_key_ref": string | null,"started_at": string | null,"started_by": string | null,"status": Database["public"]['Enums']["live_status"],"stream_url": string,"title": string,"updated_at": string,"viewer_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ended_at"?: string | null,"id"?: string,"rtmp_key_ref"?: string | null,"started_at"?: string | null,"started_by"?: string | null,"status"?: Database["public"]['Enums']["live_status"],"stream_url"?: string,"title"?: string,"updated_at"?: string,"viewer_count"?: number
                  }
                  Update: {
                    "created_at"?: string,"ended_at"?: string | null,"id"?: string,"rtmp_key_ref"?: string | null,"started_at"?: string | null,"started_by"?: string | null,"status"?: Database["public"]['Enums']["live_status"],"stream_url"?: string,"title"?: string,"updated_at"?: string,"viewer_count"?: number
                  }
                  Relationships: [
                    
                  ]
                },"login_attempts": {
                  Row: {
                    "attempted_at": string,"id": string,"identifier": string,"success": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "attempted_at"?: string,"id"?: string,"identifier": string,"success"?: boolean
                  }
                  Update: {
                    "attempted_at"?: string,"id"?: string,"identifier"?: string,"success"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"news_ingest_queue": {
                  Row: {
                    "article_id": string | null,"attempts": number,"category_hint": string | null,"created_at": string,"description": string,"id": string,"image_url": string | null,"last_error": string | null,"locked_at": string | null,"locked_by": string | null,"processed_at": string | null,"source_guid": string | null,"source_name": string,"source_published_at": string | null,"source_registry_id": string | null,"source_url": string,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id"?: string | null,"attempts"?: number,"category_hint"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"image_url"?: string | null,"last_error"?: string | null,"locked_at"?: string | null,"locked_by"?: string | null,"processed_at"?: string | null,"source_guid"?: string | null,"source_name"?: string,"source_published_at"?: string | null,"source_registry_id"?: string | null,"source_url": string,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Update: {
                    "article_id"?: string | null,"attempts"?: number,"category_hint"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"image_url"?: string | null,"last_error"?: string | null,"locked_at"?: string | null,"locked_by"?: string | null,"processed_at"?: string | null,"source_guid"?: string | null,"source_name"?: string,"source_published_at"?: string | null,"source_registry_id"?: string | null,"source_url"?: string,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "news_ingest_queue_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "news_ingest_queue_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "news_ingest_queue_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "news_ingest_queue_source_registry_id_fkey"
      columns: ["source_registry_id"]
isOneToOne: false
      referencedRelation: "public_source_registry"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "news_ingest_queue_source_registry_id_fkey"
      columns: ["source_registry_id"]
isOneToOne: false
      referencedRelation: "source_registry"
      referencedColumns: ["id"]
    }
                  ]
                },"news_pipeline_runs": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"details": NonNullable<Json>,"duration_ms": number,"error_message": string | null,"failed": number,"fetched": number,"id": string,"pending_review": number,"processed": number,"published": number,"queued": number,"skipped": number,"stage": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"duration_ms"?: number,"error_message"?: string | null,"failed"?: number,"fetched"?: number,"id"?: string,"pending_review"?: number,"processed"?: number,"published"?: number,"queued"?: number,"skipped"?: number,"stage": string,"status"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"duration_ms"?: number,"error_message"?: string | null,"failed"?: number,"fetched"?: number,"id"?: string,"pending_review"?: number,"processed"?: number,"published"?: number,"queued"?: number,"skipped"?: number,"stage"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"news_sources": {
                  Row: {
                    "consecutive_failures": number,"created_at": string,"enabled": boolean,"etag": string | null,"feed_url": string,"id": string,"interval_minutes": number,"kill_switch": boolean,"last_modified": string | null,"last_probe_at": string | null,"last_probe_error": string | null,"last_probe_http_status": number | null,"last_probe_items": number | null,"last_probe_status": string | null,"licence_note": string,"logo_url": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consecutive_failures"?: number,"created_at"?: string,"enabled"?: boolean,"etag"?: string | null,"feed_url": string,"id"?: string,"interval_minutes"?: number,"kill_switch"?: boolean,"last_modified"?: string | null,"last_probe_at"?: string | null,"last_probe_error"?: string | null,"last_probe_http_status"?: number | null,"last_probe_items"?: number | null,"last_probe_status"?: string | null,"licence_note"?: string,"logo_url"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "consecutive_failures"?: number,"created_at"?: string,"enabled"?: boolean,"etag"?: string | null,"feed_url"?: string,"id"?: string,"interval_minutes"?: number,"kill_switch"?: boolean,"last_modified"?: string | null,"last_probe_at"?: string | null,"last_probe_error"?: string | null,"last_probe_http_status"?: number | null,"last_probe_items"?: number | null,"last_probe_status"?: string | null,"licence_note"?: string,"logo_url"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"newsroom_ai_runs": {
                  Row: {
                    "article_id": string,"completed_at": string | null,"confidence": number | null,"created_at": string,"error_code": string | null,"id": string,"input_hash": string,"input_tokens": number | null,"latency_ms": number | null,"model": string,"output": NonNullable<Json>,"output_tokens": number | null,"prompt_version": string,"provider": string,"run_status": string,"stage": string,"started_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"completed_at"?: string | null,"confidence"?: number | null,"created_at"?: string,"error_code"?: string | null,"id"?: string,"input_hash": string,"input_tokens"?: number | null,"latency_ms"?: number | null,"model": string,"output"?: NonNullable<Json>,"output_tokens"?: number | null,"prompt_version": string,"provider": string,"run_status"?: string,"stage": string,"started_at"?: string | null
                  }
                  Update: {
                    "article_id"?: string,"completed_at"?: string | null,"confidence"?: number | null,"created_at"?: string,"error_code"?: string | null,"id"?: string,"input_hash"?: string,"input_tokens"?: number | null,"latency_ms"?: number | null,"model"?: string,"output"?: NonNullable<Json>,"output_tokens"?: number | null,"prompt_version"?: string,"provider"?: string,"run_status"?: string,"stage"?: string,"started_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "newsroom_ai_runs_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_ai_runs_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_ai_runs_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    }
                  ]
                },"newsroom_audit_events": {
                  Row: {
                    "actor_id": string | null,"article_id": string | null,"created_at": string,"event_metadata": NonNullable<Json>,"event_type": string,"from_state": string | null,"id": string,"to_state": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"article_id"?: string | null,"created_at"?: string,"event_metadata"?: NonNullable<Json>,"event_type": string,"from_state"?: string | null,"id"?: string,"to_state"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"article_id"?: string | null,"created_at"?: string,"event_metadata"?: NonNullable<Json>,"event_type"?: string,"from_state"?: string | null,"id"?: string,"to_state"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "newsroom_audit_events_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_audit_events_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_audit_events_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    }
                  ]
                },"newsroom_claims": {
                  Row: {
                    "article_id": string,"assessment": string,"claim_text": string,"claim_type": string,"content_version_hash": string | null,"created_at": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"assessment"?: string,"claim_text": string,"claim_type"?: string,"content_version_hash"?: string | null,"created_at"?: string,"id"?: string
                  }
                  Update: {
                    "article_id"?: string,"assessment"?: string,"claim_text"?: string,"claim_type"?: string,"content_version_hash"?: string | null,"created_at"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "newsroom_claims_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_claims_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_claims_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    }
                  ]
                },"newsroom_evidence": {
                  Row: {
                    "article_id": string,"claim_id": string,"content_hash": string | null,"content_version_hash": string | null,"created_at": string,"evidence_summary": string,"id": string,"independence_key": string | null,"retrieved_at": string,"source_domain": string | null,"source_name": string,"source_published_at": string | null,"source_url": string,"supports_claim": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"claim_id": string,"content_hash"?: string | null,"content_version_hash"?: string | null,"created_at"?: string,"evidence_summary"?: string,"id"?: string,"independence_key"?: string | null,"retrieved_at"?: string,"source_domain"?: string | null,"source_name": string,"source_published_at"?: string | null,"source_url": string,"supports_claim"?: string
                  }
                  Update: {
                    "article_id"?: string,"claim_id"?: string,"content_hash"?: string | null,"content_version_hash"?: string | null,"created_at"?: string,"evidence_summary"?: string,"id"?: string,"independence_key"?: string | null,"retrieved_at"?: string,"source_domain"?: string | null,"source_name"?: string,"source_published_at"?: string | null,"source_url"?: string,"supports_claim"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "newsroom_evidence_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_evidence_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_evidence_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_evidence_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "newsroom_claims"
      referencedColumns: ["id"]
    }
                  ]
                },"newsroom_jobs": {
                  Row: {
                    "article_id": string | null,"attempts": number,"available_at": string,"completed_at": string | null,"created_at": string,"id": string,"idempotency_key": string,"job_status": string,"job_type": string,"last_error_code": string | null,"locked_by": string | null,"locked_until": string | null,"max_attempts": number,"payload": NonNullable<Json>,"trace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id"?: string | null,"attempts"?: number,"available_at"?: string,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"idempotency_key": string,"job_status"?: string,"job_type": string,"last_error_code"?: string | null,"locked_by"?: string | null,"locked_until"?: string | null,"max_attempts"?: number,"payload"?: NonNullable<Json>,"trace_id"?: string
                  }
                  Update: {
                    "article_id"?: string | null,"attempts"?: number,"available_at"?: string,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"idempotency_key"?: string,"job_status"?: string,"job_type"?: string,"last_error_code"?: string | null,"locked_by"?: string | null,"locked_until"?: string | null,"max_attempts"?: number,"payload"?: NonNullable<Json>,"trace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "newsroom_jobs_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_jobs_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_jobs_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    }
                  ]
                },"newsroom_media_assets": {
                  Row: {
                    "alt_text_bn": string,"article_id": string,"asset_status": string,"attribution": string,"bucket_id": string | null,"content_hash": string | null,"created_at": string,"id": string,"is_representational": boolean,"license": string,"object_path": string | null,"source_url": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text_bn"?: string,"article_id": string,"asset_status"?: string,"attribution"?: string,"bucket_id"?: string | null,"content_hash"?: string | null,"created_at"?: string,"id"?: string,"is_representational"?: boolean,"license"?: string,"object_path"?: string | null,"source_url"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "alt_text_bn"?: string,"article_id"?: string,"asset_status"?: string,"attribution"?: string,"bucket_id"?: string | null,"content_hash"?: string | null,"created_at"?: string,"id"?: string,"is_representational"?: boolean,"license"?: string,"object_path"?: string | null,"source_url"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "newsroom_media_assets_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_media_assets_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_media_assets_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    }
                  ]
                },"newsroom_review_decisions": {
                  Row: {
                    "article_id": string,"article_version_hash": string,"authority_approval": boolean,"decided_at": string,"decision": string,"id": string,"policy_version": string,"reason": string,"reviewer_id": string,"reviewer_role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"article_version_hash": string,"authority_approval"?: boolean,"decided_at"?: string,"decision": string,"id"?: string,"policy_version"?: string,"reason"?: string,"reviewer_id": string,"reviewer_role": string
                  }
                  Update: {
                    "article_id"?: string,"article_version_hash"?: string,"authority_approval"?: boolean,"decided_at"?: string,"decision"?: string,"id"?: string,"policy_version"?: string,"reason"?: string,"reviewer_id"?: string,"reviewer_role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "newsroom_review_decisions_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_review_decisions_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_review_decisions_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    }
                  ]
                },"newsroom_story_workflows": {
                  Row: {
                    "article_id": string,"auto_publish_allowed": boolean,"content_version_hash": string | null,"created_at": string,"independent_source_count": number,"risk_category": string,"successful_verifier_count": number,"updated_at": string,"workflow_state": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"auto_publish_allowed"?: boolean,"content_version_hash"?: string | null,"created_at"?: string,"independent_source_count"?: number,"risk_category"?: string,"successful_verifier_count"?: number,"updated_at"?: string,"workflow_state"?: string
                  }
                  Update: {
                    "article_id"?: string,"auto_publish_allowed"?: boolean,"content_version_hash"?: string | null,"created_at"?: string,"independent_source_count"?: number,"risk_category"?: string,"successful_verifier_count"?: number,"updated_at"?: string,"workflow_state"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "newsroom_story_workflows_article_id_fkey"
      columns: ["article_id"]
isOneToOne: true
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_story_workflows_article_id_fkey"
      columns: ["article_id"]
isOneToOne: true
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "newsroom_story_workflows_article_id_fkey"
      columns: ["article_id"]
isOneToOne: true
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    }
                  ]
                },"newsroom_verification_policies": {
                  Row: {
                    "active": boolean,"auto_publish_allowed": boolean,"category": string,"min_independent_sources": number,"min_successful_verifiers": number,"policy_version": string,"requires_authority_approval": boolean,"requires_human_review": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"auto_publish_allowed"?: boolean,"category": string,"min_independent_sources"?: number,"min_successful_verifiers"?: number,"policy_version"?: string,"requires_authority_approval"?: boolean,"requires_human_review"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"auto_publish_allowed"?: boolean,"category"?: string,"min_independent_sources"?: number,"min_successful_verifiers"?: number,"policy_version"?: string,"requires_authority_approval"?: boolean,"requires_human_review"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"is_read": boolean,"payload": NonNullable<Json>,"type": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_read"?: boolean,"payload"?: NonNullable<Json>,"type"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_read"?: boolean,"payload"?: NonNullable<Json>,"type"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"district": string,"full_name": string,"id": string,"phone": string,"role": Database["public"]['Enums']["app_role"],"two_factor_enabled": boolean,"two_factor_secret": string,"updated_at": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"district"?: string,"full_name"?: string,"id": string,"phone"?: string,"role"?: Database["public"]['Enums']["app_role"],"two_factor_enabled"?: boolean,"two_factor_secret"?: string,"updated_at"?: string,"verified"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"district"?: string,"full_name"?: string,"id"?: string,"phone"?: string,"role"?: Database["public"]['Enums']["app_role"],"two_factor_enabled"?: boolean,"two_factor_secret"?: string,"updated_at"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"public_article_previews": {
                  Row: {
                    "article_id": string,"category": string,"category_key": string,"excerpt_bn": string,"featured_image": string,"is_premium": boolean,"published_at": string | null,"thumbnail_url": string,"title_bn": string,"title_en": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"category"?: string,"category_key"?: string,"excerpt_bn"?: string,"featured_image"?: string,"is_premium"?: boolean,"published_at"?: string | null,"thumbnail_url"?: string,"title_bn": string,"title_en"?: string,"updated_at"?: string
                  }
                  Update: {
                    "article_id"?: string,"category"?: string,"category_key"?: string,"excerpt_bn"?: string,"featured_image"?: string,"is_premium"?: boolean,"published_at"?: string | null,"thumbnail_url"?: string,"title_bn"?: string,"title_en"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "public_article_previews_article_id_fkey"
      columns: ["article_id"]
isOneToOne: true
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "public_article_previews_article_id_fkey"
      columns: ["article_id"]
isOneToOne: true
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "public_article_previews_article_id_fkey"
      columns: ["article_id"]
isOneToOne: true
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    }
                  ]
                },"reading_history": {
                  Row: {
                    "article_id": string | null,"id": string,"last_read_at": string,"progress_percent": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id"?: string | null,"id"?: string,"last_read_at"?: string,"progress_percent"?: number,"user_id": string
                  }
                  Update: {
                    "article_id"?: string | null,"id"?: string,"last_read_at"?: string,"progress_percent"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reading_history_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"social_posts": {
                  Row: {
                    "article_id": string,"attempt_count": number,"created_at": string,"error_message": string | null,"external_post_id": string | null,"id": string,"payload": NonNullable<Json>,"platform": string,"posted_at": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"attempt_count"?: number,"created_at"?: string,"error_message"?: string | null,"external_post_id"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"platform": string,"posted_at"?: string | null,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "article_id"?: string,"attempt_count"?: number,"created_at"?: string,"error_message"?: string | null,"external_post_id"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"platform"?: string,"posted_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "social_posts_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "social_posts_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_article_detail"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "social_posts_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "public_articles_feed"
      referencedColumns: ["id"]
    }
                  ]
                },"source_registry": {
                  Row: {
                    "bias_leaning": string | null,"coverage_categories": (string)[],"created_at": string,"credibility": number,"daily_cap_pct": number,"domain": string | null,"feed_enabled": boolean,"feed_url": string | null,"id": string,"is_active": boolean,"last_fetch_status": string | null,"last_fetched_at": string | null,"name_bn": string,"name_en": string,"notes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bias_leaning"?: string | null,"coverage_categories"?: (string)[],"created_at"?: string,"credibility"?: number,"daily_cap_pct"?: number,"domain"?: string | null,"feed_enabled"?: boolean,"feed_url"?: string | null,"id"?: string,"is_active"?: boolean,"last_fetch_status"?: string | null,"last_fetched_at"?: string | null,"name_bn": string,"name_en": string,"notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "bias_leaning"?: string | null,"coverage_categories"?: (string)[],"created_at"?: string,"credibility"?: number,"daily_cap_pct"?: number,"domain"?: string | null,"feed_enabled"?: boolean,"feed_url"?: string | null,"id"?: string,"is_active"?: boolean,"last_fetch_status"?: string | null,"last_fetched_at"?: string | null,"name_bn"?: string,"name_en"?: string,"notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "amount_bdt": number,"created_at": string,"expires_at": string | null,"id": string,"interval": string,"plan": string,"provider": string,"provider_ref": string | null,"started_at": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_bdt"?: number,"created_at"?: string,"expires_at"?: string | null,"id"?: string,"interval"?: string,"plan"?: string,"provider"?: string,"provider_ref"?: string | null,"started_at"?: string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "amount_bdt"?: number,"created_at"?: string,"expires_at"?: string | null,"id"?: string,"interval"?: string,"plan"?: string,"provider"?: string,"provider_ref"?: string | null,"started_at"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"videos": {
                  Row: {
                    "category_key": string,"created_at": string,"description_bn": string,"duration_sec": number,"embed_url": string | null,"id": string,"is_live": boolean,"published_at": string | null,"status": string,"thumbnail_url": string,"title_bn": string,"title_en": string,"updated_at": string,"video_url": string | null,"view_count": number,"youtube_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_key"?: string,"created_at"?: string,"description_bn"?: string,"duration_sec"?: number,"embed_url"?: string | null,"id"?: string,"is_live"?: boolean,"published_at"?: string | null,"status"?: string,"thumbnail_url"?: string,"title_bn": string,"title_en"?: string,"updated_at"?: string,"video_url"?: string | null,"view_count"?: number,"youtube_id"?: string | null
                  }
                  Update: {
                    "category_key"?: string,"created_at"?: string,"description_bn"?: string,"duration_sec"?: number,"embed_url"?: string | null,"id"?: string,"is_live"?: boolean,"published_at"?: string | null,"status"?: string,"thumbnail_url"?: string,"title_bn"?: string,"title_en"?: string,"updated_at"?: string,"video_url"?: string | null,"view_count"?: number,"youtube_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "public_article_detail": {
                  Row: {
                    "canonical_url": string | null,"category": string | null,"category_key": string | null,"content_bn": string | null,"content_en": string | null,"created_at": string | null,"excerpt_bn": string | null,"featured_image": string | null,"id": string | null,"image_alt_bn": string | null,"image_credit": string | null,"image_is_representational": boolean | null,"is_fallback": boolean | null,"origin": string | null,"published_at": string | null,"source_name": string | null,"source_url": string | null,"status": string | null,"thumbnail_url": string | null,"title_bn": string | null,"title_en": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "canonical_url"?: string | null,"category"?: string | null,"category_key"?: string | null,"content_bn"?: string | null,"content_en"?: string | null,"created_at"?: string | null,"excerpt_bn"?: string | null,"featured_image"?: string | null,"id"?: string | null,"image_alt_bn"?: string | null,"image_credit"?: string | null,"image_is_representational"?: boolean | null,"is_fallback"?: boolean | null,"origin"?: string | null,"published_at"?: string | null,"source_name"?: string | null,"source_url"?: string | null,"status"?: string | null,"thumbnail_url"?: string | null,"title_bn"?: string | null,"title_en"?: string | null
                         }
                        Update: {
                           "canonical_url"?: string | null,"category"?: string | null,"category_key"?: string | null,"content_bn"?: string | null,"content_en"?: string | null,"created_at"?: string | null,"excerpt_bn"?: string | null,"featured_image"?: string | null,"id"?: string | null,"image_alt_bn"?: string | null,"image_credit"?: string | null,"image_is_representational"?: boolean | null,"is_fallback"?: boolean | null,"origin"?: string | null,"published_at"?: string | null,"source_name"?: string | null,"source_url"?: string | null,"status"?: string | null,"thumbnail_url"?: string | null,"title_bn"?: string | null,"title_en"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"public_articles_feed": {
                  Row: {
                    "canonical_url": string | null,"category": string | null,"category_key": string | null,"content_bn": string | null,"excerpt_bn": string | null,"featured_image": string | null,"id": string | null,"image_alt_bn": string | null,"image_credit": string | null,"image_is_representational": boolean | null,"is_fallback": boolean | null,"origin": string | null,"published_at": string | null,"source_name": string | null,"source_url": string | null,"status": string | null,"thumbnail_url": string | null,"title_bn": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "canonical_url"?: string | null,"category"?: string | null,"category_key"?: string | null,"content_bn"?: string | null,"excerpt_bn"?: string | null,"featured_image"?: string | null,"id"?: string | null,"image_alt_bn"?: string | null,"image_credit"?: string | null,"image_is_representational"?: boolean | null,"is_fallback"?: boolean | null,"origin"?: string | null,"published_at"?: string | null,"source_name"?: string | null,"source_url"?: string | null,"status"?: string | null,"thumbnail_url"?: string | null,"title_bn"?: string | null
                         }
                        Update: {
                           "canonical_url"?: string | null,"category"?: string | null,"category_key"?: string | null,"content_bn"?: string | null,"excerpt_bn"?: string | null,"featured_image"?: string | null,"id"?: string | null,"image_alt_bn"?: string | null,"image_credit"?: string | null,"image_is_representational"?: boolean | null,"is_fallback"?: boolean | null,"origin"?: string | null,"published_at"?: string | null,"source_name"?: string | null,"source_url"?: string | null,"status"?: string | null,"thumbnail_url"?: string | null,"title_bn"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"public_source_registry": {
                  Row: {
                    "created_at": string | null,"domain": string | null,"id": string | null,"is_active": boolean | null,"name_bn": string | null,"name_en": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"domain"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"name_bn"?: string | null,"name_en"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"domain"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"name_bn"?: string | null,"name_en"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "acquire_news_pipeline_lock":
{ Args: { "p_stale_before": string }; Returns: string
                           },
"admin_grant_manual_subscription":
{ Args: { "p_expires_at"?: string,"p_interval"?: string,"p_plan": string,"p_user_id": string }; Returns: string
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"decrypt_vault_secret":
{ Args: { "p_secret_id": string }; Returns: string
                           },
"is_rate_limited":
{ Args: { "p_identifier": string,"p_max"?: number,"p_window_minutes"?: number }; Returns: boolean
                           },
"news_pipeline_last_success":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"newsroom_claim_jobs":
{ Args: { "p_limit"?: number,"p_worker_id": string }; Returns: {
              "article_id": string | null,
"attempts": number,
"available_at": string,
"completed_at": string | null,
"created_at": string,
"id": string,
"idempotency_key": string,
"job_status": string,
"job_type": string,
"last_error_code": string | null,
"locked_by": string | null,
"locked_until": string | null,
"max_attempts": number,
"payload": NonNullable<Json>,
"trace_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "newsroom_jobs"
        isOneToOne: false
        isSetofReturn: true
      } },
"newsroom_finish_job":
{ Args: { "p_error_code"?: string,"p_job_id": string,"p_succeeded": boolean }; Returns: Json
                           } |
{ Args: { "p_error_code"?: string,"p_job_id": string,"p_succeeded": boolean,"p_worker_id": string }; Returns: Json
                           },
"newsroom_publish_article":
{ Args: { "p_article_id": string }; Returns: Json
                           },
"newsroom_record_review_decision":
{ Args: { "p_article_id": string,"p_article_version_hash": string,"p_authority_approval"?: boolean,"p_decision": string,"p_reason"?: string }; Returns: Json
                           },
"newsroom_submit_for_verification":
{ Args: { "p_article_id": string }; Returns: Json
                           },
"pipeline_health":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"platform_role":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"set_breaking_ticker":
{ Args: { "p_text": string }; Returns: boolean
                           },
"set_user_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           },
"submit_field_report":
{ Args: { "p_report_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "citizen_reporter"|"staff_reporter"|"desk_editor"|"chief_editor"|"admin"|"reader"|"reporter"|"editor","live_status": "idle"|"live"|"ended","report_status": "draft"|"pending_review"|"approved_for_live"|"published"|"rejected","vault_env": "prod"|"staging"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["citizen_reporter", "staff_reporter", "desk_editor", "chief_editor", "admin", "reader", "reporter", "editor"],"live_status": ["idle", "live", "ended"],"report_status": ["draft", "pending_review", "approved_for_live", "published", "rejected"],"vault_env": ["prod", "staging"]
          }
        }
} as const
