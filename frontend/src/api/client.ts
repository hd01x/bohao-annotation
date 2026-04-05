const BASE = '/api';

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    if (res.status === 404) return null as T;
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export const api = {
  getSamples: (dataset?: string) =>
    request<any[]>(`/samples${dataset ? `?dataset=${dataset}` : ''}`),

  getSample: (uid: string) =>
    request<any>(`/samples/${uid}`),

  getStage1: (uid: string) =>
    request<any>(`/samples/${uid}/stage1`),

  getShuffleOrder: (uid: string, annotator: string) =>
    request<{ order: string[] }>(`/annotations/shuffle/${uid}/${annotator}`),

  saveAnnotation: (stage: number, body: any) =>
    request<any>(`/annotations/stage${stage}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  loadAnnotation: (stage: number, annotator: string, uid: string) =>
    request<any>(`/annotations/${stage}/${annotator}/${uid}`),

  getProgress: (stage: number, annotator: string) =>
    request<any>(`/progress/${stage}/${annotator}`),

  getNextUid: (stage: number, annotator: string, dataset?: string) =>
    request<{ uid: string | null }>(`/queue/${stage}/${annotator}${dataset ? `?dataset=${dataset}` : ''}`),

  getAnnotators: () => request<string[]>(`/annotators`),
};
