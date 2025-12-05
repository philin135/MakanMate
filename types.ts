export interface PlaceSource {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        content: string;
      }[]
    }
  };
  web?: {
    uri: string;
    title: string;
  };
}

export interface SearchResult {
  text: string;
  groundingChunks: GroundingChunk[];
}

export enum AppMode {
  FINDER = 'FINDER',
  LIVE_CHAT = 'LIVE_CHAT',
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
