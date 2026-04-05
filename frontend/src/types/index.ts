export interface SampleIndex {
  uid: string;
  sample_id: string;
  dataset: string;
  domain: string;
  hop_count: number;
  num_claims: number;
  num_context: number;
  has_stage1: boolean;
}

export interface Sample {
  uid: string;
  sample_id: string;
  dataset: string;
  domain: string;
  question: string;
  gold_answer: string;
  context: string[];
  hop_count: number;
  model_name: string;
  model_id: string;
  response: string;
  claims: string[];
  predicted_answer: string;
}

export interface LabeledClaim {
  id: string;
  text: string;
  claim_type?: string;
  verdict?: string;
  dependencies?: string[];
  votes?: Record<string, number>;
  annotator_labels?: Record<string, string>;
}

export interface Stage1Data {
  uid: string;
  labeled_claims: LabeledClaim[];
}

export interface ProgressDataset {
  total: number;
  done: number;
}

export interface ProgressResponse {
  annotator: string;
  stage: number;
  model: string;
  datasets: Record<string, ProgressDataset>;
  overall: ProgressDataset;
}
