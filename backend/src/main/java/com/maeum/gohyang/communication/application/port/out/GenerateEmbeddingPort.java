package com.maeum.gohyang.communication.application.port.out;

import java.util.List;

/**
 * 텍스트를 벡터 임베딩으로 변환하는 Port.
 * 임베딩 모델(Ollama nomic-embed-text 등)을 호출한다.
 */
public interface GenerateEmbeddingPort {

    /**
     * @param text 임베딩할 텍스트
     * @return 벡터 (List&lt;Float&gt;). 모델에 따라 차원이 다름 (nomic-embed-text: 768)
     */
    List<Float> generate(String text);
}
