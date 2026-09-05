#!/usr/bin/env python3
"""
Retrieval Evaluation Script.

Evaluates semantic retrieval accuracy against ground-truth query-chunk pairs
in tests/fixtures/eval_dataset.json. Computes Precision@k, Recall@k, and
Mean Reciprocal Rank (MRR).
"""
import asyncio
import json
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings

from app.models.chunk import DocumentChunk
from app.services.retrieval_service import get_retrieval_service


async def main():
    settings = get_settings()
    retrieval_svc = get_retrieval_service(settings)

    dataset_path = Path(__file__).parent.parent / "tests" / "fixtures" / "eval_dataset.json"
    if not dataset_path.exists():
        print(f"Dataset not found at {dataset_path}")
        return

    with open(dataset_path, "r", encoding="utf-8") as f:
        datasets = json.load(f)

    print("=" * 65)
    print("      RAG SEMANTIC RETRIEVAL EVALUATION BENCHMARK       ")
    print("=" * 65)

    total_queries = 0
    mrr_sum = 0.0
    top1_hits = 0
    top3_hits = 0

    for item in datasets:
        doc_title = item["document_title"]
        doc_id = uuid.uuid4()
        raw_chunks = item["text_chunks"]

        # Construct DocumentChunk objects
        chunks = [
            DocumentChunk(
                id=uuid.uuid4(),
                document_id=doc_id,
                chunk_index=i,
                text=text,
                token_count=len(text.split()),
                chunk_type="paragraph",
            )
            for i, text in enumerate(raw_chunks)
        ]

        # Index chunks
        await retrieval_svc.index_document_chunks(doc_id, chunks)

        print(f"\nDocument: '{doc_title}' ({len(chunks)} chunks indexed)")
        print("-" * 65)

        for query_item in item["eval_queries"]:
            query = query_item["query"]
            expected_idx = query_item["expected_chunk_index"]
            total_queries += 1

            results = await retrieval_svc.search_document(doc_id, query, top_k=3)

            rank = 0
            for r_idx, res in enumerate(results, start=1):
                if res.chunk_index == expected_idx:
                    rank = r_idx
                    break

            reciprocal_rank = 1.0 / rank if rank > 0 else 0.0
            mrr_sum += reciprocal_rank

            if rank == 1:
                top1_hits += 1
            if rank in (1, 2, 3):
                top3_hits += 1

            status_str = f"HIT (Rank #{rank})" if rank > 0 else "MISS"
            print(f"Query: '{query}' -> Expected Chunk #{expected_idx} -> {status_str}")

    precision_at_1 = top1_hits / total_queries if total_queries else 0.0
    recall_at_3 = top3_hits / total_queries if total_queries else 0.0
    mrr = mrr_sum / total_queries if total_queries else 0.0

    print("\n" + "=" * 65)
    print("SUMMARY METRICS:")
    print(f"Total Queries Evaluated: {total_queries}")
    print(f"Precision @ 1:           {precision_at_1:.2%}")
    print(f"Recall @ 3:              {recall_at_3:.2%}")
    print(f"Mean Reciprocal Rank:    {mrr:.4f}")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
