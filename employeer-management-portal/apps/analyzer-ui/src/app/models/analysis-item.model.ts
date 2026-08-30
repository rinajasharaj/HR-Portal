export interface AnalysisEvidence {
  findingType: string;
  source?: string;
  library?: string;
  domainA?: string;
  domainB?: string;
  target?: string;
  rule?: string;
}

export interface AiExplanation {
  explanation: string;
  consequences: string;
  recommendedFix: string;
}

export interface AnalysisItem {
  evidence: AnalysisEvidence;
  aiExplanation: AiExplanation;
  validationWarnings: string[];
}
