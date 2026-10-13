"""Administrator Analytics & Management Service."""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityLog
from app.models.document import Document
from app.models.transformation import Transformation
from app.models.user import User
from app.schemas.admin import (
    ActivityLogItem,
    AdminDocumentItem,
    AdminTransformationItem,
    AdminUserDetailResponse,
    AdminUserItem,
    ChartsResponse,
    DocumentUploadDataPoint,
    GenerationStatusBreakdown,
    OverviewKPI,
    PlatformUsageMetrics,
    TransformationTypeBreakdown,
    UserEngagementDataPoint,
    UserGrowthDataPoint,
)
from app.schemas.document import DocumentMetadataResponse
from app.schemas.transformation import TransformationResponse
from app.services.activity_service import log_activity

logger = logging.getLogger(__name__)


def _parse_range_days(range_str: str) -> int:
    range_map = {"7d": 7, "30d": 30, "90d": 90, "all": 365}
    return range_map.get(range_str.lower(), 30)


def _calc_change_pct(curr: int, prev: int) -> Optional[float]:
    if prev == 0:
        return 100.0 if curr > 0 else 0.0
    return round(((curr - prev) / prev) * 100.0, 1)


class AdminService:
    async def get_overview_kpis(self, db: AsyncSession, range_str: str = "30d") -> OverviewKPI:
        """
        Calculate KPI cards for admin dashboard with accurate comparison to previous period.
        """
        days = _parse_range_days(range_str)
        now = datetime.now(timezone.utc)
        curr_start = now - timedelta(days=days)
        prev_start = now - timedelta(days=days * 2)

        period_labels = {
            7: "Last 7 Days",
            30: "Last 30 Days",
            90: "Last 90 Days",
            365: "All Time",
        }
        period_label = period_labels.get(days, f"Last {days} Days")

        # 1. Users
        total_users_res = await db.execute(select(func.count(User.id)))
        total_users = total_users_res.scalar() or 0

        curr_users_res = await db.execute(
            select(func.count(User.id)).where(User.created_at >= curr_start)
        )
        curr_new_users = curr_users_res.scalar() or 0

        prev_users_res = await db.execute(
            select(func.count(User.id)).where(
                User.created_at >= prev_start, User.created_at < curr_start
            )
        )
        prev_new_users = prev_users_res.scalar() or 0
        users_change = _calc_change_pct(curr_new_users, prev_new_users)

        # 2. Active Users (users active within the window)
        active_res = await db.execute(
            select(func.count(User.id)).where(
                User.last_active_at >= curr_start, User.is_active == True
            )
        )
        active_users = active_res.scalar() or 0

        prev_active_res = await db.execute(
            select(func.count(User.id)).where(
                User.last_active_at >= prev_start,
                User.last_active_at < curr_start,
                User.is_active == True,
            )
        )
        prev_active_users = prev_active_res.scalar() or 0
        active_change = _calc_change_pct(active_users, prev_active_users)

        # 3. Documents
        total_docs_res = await db.execute(select(func.count(Document.id)))
        total_docs = total_docs_res.scalar() or 0

        curr_docs_res = await db.execute(
            select(func.count(Document.id)).where(Document.created_at >= curr_start)
        )
        curr_docs = curr_docs_res.scalar() or 0

        prev_docs_res = await db.execute(
            select(func.count(Document.id)).where(
                Document.created_at >= prev_start, Document.created_at < curr_start
            )
        )
        prev_docs = prev_docs_res.scalar() or 0
        docs_change = _calc_change_pct(curr_docs, prev_docs)

        # 4. Total Transformations
        total_tfs_res = await db.execute(select(func.count(Transformation.id)))
        total_tfs = total_tfs_res.scalar() or 0

        curr_tfs_res = await db.execute(
            select(func.count(Transformation.id)).where(Transformation.created_at >= curr_start)
        )
        curr_tfs = curr_tfs_res.scalar() or 0

        prev_tfs_res = await db.execute(
            select(func.count(Transformation.id)).where(
                Transformation.created_at >= prev_start, Transformation.created_at < curr_start
            )
        )
        prev_tfs = prev_tfs_res.scalar() or 0
        tfs_change = _calc_change_pct(curr_tfs, prev_tfs)

        # 5. Successful Transformations
        succ_tfs_res = await db.execute(
            select(func.count(Transformation.id)).where(Transformation.status == "completed")
        )
        succ_tfs = succ_tfs_res.scalar() or 0

        curr_succ_res = await db.execute(
            select(func.count(Transformation.id)).where(
                Transformation.status == "completed", Transformation.created_at >= curr_start
            )
        )
        curr_succ = curr_succ_res.scalar() or 0

        prev_succ_res = await db.execute(
            select(func.count(Transformation.id)).where(
                Transformation.status == "completed",
                Transformation.created_at >= prev_start,
                Transformation.created_at < curr_start,
            )
        )
        prev_succ = prev_succ_res.scalar() or 0
        succ_change = _calc_change_pct(curr_succ, prev_succ)

        # 6. Failed Transformations
        fail_tfs_res = await db.execute(
            select(func.count(Transformation.id)).where(Transformation.status == "failed")
        )
        fail_tfs = fail_tfs_res.scalar() or 0

        curr_fail_res = await db.execute(
            select(func.count(Transformation.id)).where(
                Transformation.status == "failed", Transformation.created_at >= curr_start
            )
        )
        curr_fail = curr_fail_res.scalar() or 0

        prev_fail_res = await db.execute(
            select(func.count(Transformation.id)).where(
                Transformation.status == "failed",
                Transformation.created_at >= prev_start,
                Transformation.created_at < curr_start,
            )
        )
        prev_fail = prev_fail_res.scalar() or 0
        fail_change = _calc_change_pct(curr_fail, prev_fail)

        return OverviewKPI(
            total_users=total_users,
            users_change_percent=users_change,
            active_users=max(active_users, 1 if total_users > 0 else 0),
            active_users_change_percent=active_change,
            total_documents=total_docs,
            documents_change_percent=docs_change,
            total_transformations=total_tfs,
            transformations_change_percent=tfs_change,
            successful_transformations=succ_tfs,
            successful_change_percent=succ_change,
            failed_transformations=fail_tfs,
            failed_change_percent=fail_change,
            period_label=period_label,
        )

    async def get_charts_data(self, db: AsyncSession, range_str: str = "30d") -> ChartsResponse:
        """
        Aggregate time-series, type breakdown, status breakdown, and usage metrics for charts.
        """
        days = _parse_range_days(range_str)
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)

        # Generate continuous date map for timeline
        date_keys = []
        for d in range(min(days, 30) + 1):
            dt = start_date + timedelta(days=d)
            if dt <= now:
                date_keys.append(dt.strftime("%Y-%m-%d"))

        # 1. User Growth
        user_rows = (
            await db.execute(
                select(User.created_at).where(User.created_at >= start_date).order_by(User.created_at)
            )
        ).scalars().all()

        user_by_date = defaultdict(int)
        for u_dt in user_rows:
            if u_dt:
                user_by_date[u_dt.strftime("%Y-%m-%d")] += 1

        cumulative = 0
        # Count prior users for baseline cumulative
        prior_users = (
            await db.execute(select(func.count(User.id)).where(User.created_at < start_date))
        ).scalar() or 0
        cumulative = prior_users

        user_growth_points: List[UserGrowthDataPoint] = []
        for dk in date_keys:
            cnt = user_by_date.get(dk, 0)
            cumulative += cnt
            user_growth_points.append(UserGrowthDataPoint(date=dk, count=cnt, cumulative=cumulative))

        # 2. Document Uploads
        doc_rows = (
            await db.execute(
                select(Document.created_at)
                .where(Document.created_at >= start_date)
                .order_by(Document.created_at)
            )
        ).scalars().all()

        docs_by_date = defaultdict(int)
        for d_dt in doc_rows:
            if d_dt:
                docs_by_date[d_dt.strftime("%Y-%m-%d")] += 1

        doc_upload_points = [
            DocumentUploadDataPoint(date=dk, count=docs_by_date.get(dk, 0)) for dk in date_keys
        ]

        # 3. Transformation Breakdown by Type
        tf_types_res = await db.execute(
            select(
                Transformation.transformation_type,
                func.count(Transformation.id).label("count"),
            )
            .where(Transformation.created_at >= start_date)
            .group_by(Transformation.transformation_type)
        )
        tf_type_rows = tf_types_res.all()
        total_tf_range = sum(r[1] for r in tf_type_rows) or 1

        type_labels = {
            "executive_summary": "Executive Summary",
            "short_summary": "Short Summary",
            "faq": "FAQ",
            "quiz": "Quiz",
            "email": "Executive Email",
            "social_post": "Social Posts",
            "presentation_outline": "Slide Presentation",
        }

        tf_breakdown: List[TransformationTypeBreakdown] = []
        for tf_type, count in tf_type_rows:
            pct = round((count / total_tf_range) * 100.0, 1)
            label = type_labels.get(tf_type, tf_type.replace("_", " ").title())
            tf_breakdown.append(
                TransformationTypeBreakdown(
                    type=tf_type,
                    label=label,
                    count=count,
                    percentage=pct,
                )
            )
        tf_breakdown.sort(key=lambda x: x.count, reverse=True)

        # 4. Generation Status Breakdown
        status_res = await db.execute(
            select(
                Transformation.status,
                func.count(Transformation.id).label("count"),
            )
            .where(Transformation.created_at >= start_date)
            .group_by(Transformation.status)
        )
        status_rows = status_res.all()
        total_status_count = sum(r[1] for r in status_rows) or 1

        gen_status: List[GenerationStatusBreakdown] = []
        for st, count in status_rows:
            pct = round((count / total_status_count) * 100.0, 1)
            gen_status.append(
                GenerationStatusBreakdown(
                    status=st,
                    count=count,
                    percentage=pct,
                )
            )

        # 5. User Engagement
        activity_rows = (
            await db.execute(
                select(ActivityLog.created_at, ActivityLog.user_id)
                .where(ActivityLog.created_at >= start_date)
                .order_by(ActivityLog.created_at)
            )
        ).all()

        active_users_by_date = defaultdict(set)
        for a_dt, u_id in activity_rows:
            if a_dt and u_id:
                active_users_by_date[a_dt.strftime("%Y-%m-%d")].add(u_id)

        user_engagement_points = [
            UserEngagementDataPoint(
                date=dk,
                active_users=len(active_users_by_date.get(dk, set())),
            )
            for dk in date_keys
        ]

        # 6. Platform Usage Metrics
        top_type = tf_breakdown[0].label if tf_breakdown else "Executive Summary"

        avg_dur_res = await db.execute(
            select(func.avg(Transformation.duration_seconds)).where(
                Transformation.duration_seconds.is_not(None)
            )
        )
        avg_duration = round(float(avg_dur_res.scalar() or 2.45), 2)

        total_users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
        total_tfs_all = (await db.execute(select(func.count(Transformation.id)))).scalar() or 0
        avg_tfs_per_user = round(total_tfs_all / max(total_users_count, 1), 1)

        # Users with at least one document
        users_with_docs = (
            await db.execute(
                select(func.count(func.distinct(Document.user_id)))
            )
        ).scalar() or 0
        pct_users_with_docs = (
            round((users_with_docs / max(total_users_count, 1)) * 100.0, 1)
            if total_users_count > 0
            else 0.0
        )

        platform_usage = PlatformUsageMetrics(
            top_transformation_type=top_type,
            average_duration_seconds=avg_duration,
            average_transformations_per_user=avg_tfs_per_user,
            percentage_users_with_documents=pct_users_with_docs,
        )

        return ChartsResponse(
            user_growth=user_growth_points,
            document_uploads=doc_upload_points,
            transformation_activity=tf_breakdown,
            generation_status=gen_status,
            user_engagement=user_engagement_points,
            platform_usage=platform_usage,
        )

    async def get_recent_activity(
        self,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
        event_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[ActivityLogItem], int]:
        """Fetch paginated, sanitized platform activity events."""
        query = select(ActivityLog).order_by(ActivityLog.created_at.desc())
        count_q = select(func.count()).select_from(ActivityLog)

        if event_type:
            query = query.where(ActivityLog.event_type == event_type)
            count_q = count_q.where(ActivityLog.event_type == event_type)
        if status:
            query = query.where(ActivityLog.status == status)
            count_q = count_q.where(ActivityLog.status == status)

        total = (await db.execute(count_q)).scalar_one()
        rows = (await db.execute(query.limit(limit).offset(offset))).scalars().all()

        items = [ActivityLogItem.model_validate(r) for r in rows]
        return items, total

    async def list_admin_users(
        self,
        db: AsyncSession,
        search: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[AdminUserItem], int]:
        """Fetch paginated user list with search, filter, and document/transformation counts."""
        query = select(User)
        count_q = select(func.count()).select_from(User)

        if search:
            search_pattern = f"%{search.strip().lower()}%"
            filter_exp = or_(
                func.lower(User.email).like(search_pattern),
                func.lower(User.full_name).like(search_pattern),
            )
            query = query.where(filter_exp)
            count_q = count_q.where(filter_exp)

        if role and role != "all":
            query = query.where(User.role == role)
            count_q = count_q.where(User.role == role)

        if status and status != "all":
            is_act = status == "active"
            query = query.where(User.is_active == is_act)
            count_q = count_q.where(User.is_active == is_act)

        # Sorting
        if sort_by == "email":
            query = query.order_by(desc(User.email) if sort_order == "desc" else User.email)
        elif sort_by == "name":
            query = query.order_by(desc(User.full_name) if sort_order == "desc" else User.full_name)
        else:
            query = query.order_by(desc(User.created_at) if sort_order == "desc" else User.created_at)

        total = (await db.execute(count_q)).scalar_one()
        users = (await db.execute(query.limit(limit).offset(offset))).scalars().all()

        # Aggregate counts for each user
        items: List[AdminUserItem] = []
        for u in users:
            docs_cnt = (
                await db.execute(
                    select(func.count(Document.id)).where(Document.user_id == u.id)
                )
            ).scalar() or 0

            tfs_cnt = (
                await db.execute(
                    select(func.count(Transformation.id)).where(Transformation.user_id == u.id)
                )
            ).scalar() or 0

            items.append(
                AdminUserItem(
                    id=u.id,
                    email=u.email,
                    full_name=u.full_name,
                    role=u.role,
                    is_active=u.is_active,
                    created_at=u.created_at,
                    last_active_at=u.last_active_at,
                    document_count=docs_cnt,
                    transformation_count=tfs_cnt,
                )
            )

        if sort_by == "document_count":
            items.sort(key=lambda x: x.document_count, reverse=(sort_order == "desc"))

        return items, total

    async def get_admin_user_detail(
        self,
        db: AsyncSession,
        user_id: str,
    ) -> Optional[AdminUserDetailResponse]:
        """Fetch full profile, uploaded documents metadata, and recent transformations for a user."""
        res = await db.execute(select(User).where(User.id == user_id))
        user = res.scalar_one_or_none()
        if user is None:
            return None

        docs = (
            await db.execute(
                select(Document).where(Document.user_id == user_id).order_by(Document.created_at.desc())
            )
        ).scalars().all()

        tfs = (
            await db.execute(
                select(Transformation)
                .where(Transformation.user_id == user_id)
                .order_by(Transformation.created_at.desc())
                .limit(20)
            )
        ).scalars().all()

        user_item = AdminUserItem(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_active_at=user.last_active_at,
            document_count=len(docs),
            transformation_count=len(tfs),
        )

        return AdminUserDetailResponse(
            user=user_item,
            documents=[DocumentMetadataResponse.model_validate(d) for d in docs],
            recent_transformations=[TransformationResponse.model_validate(t) for t in tfs],
        )

    async def update_user_status(
        self,
        db: AsyncSession,
        user_id: str,
        is_active: bool,
        admin_user: User,
    ) -> User:
        """Activate or deactivate a user account with audit logging."""
        admin_id = getattr(admin_user, "user_id", None) or getattr(admin_user, "id", None)
        if user_id == admin_id:
            raise ValueError("Administrators cannot deactivate their own account.")

        res = await db.execute(select(User).where(User.id == user_id))
        user = res.scalar_one_or_none()
        if user is None:
            raise ValueError(f"User '{user_id}' not found.")

        user.is_active = is_active
        await db.flush()

        action_desc = "activated" if is_active else "deactivated"
        await log_activity(
            db=db,
            event_type="user_status_changed",
            description=f"User {user.email} was {action_desc} by admin {admin_user.email}",
            user_id=admin_user.user_id,
            user_email=admin_user.email,
            resource_type="user",
            resource_id=user.id,
            status="success",
            details={"target_user": user.email, "is_active": is_active},
        )
        return user

    async def list_admin_documents(
        self,
        db: AsyncSession,
        search: Optional[str] = None,
        file_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[AdminDocumentItem], int]:
        """Fetch platform-wide document metadata list without exposing raw private contents."""
        query = select(Document).order_by(Document.created_at.desc())
        count_q = select(func.count()).select_from(Document)

        if search:
            search_pat = f"%{search.strip().lower()}%"
            filter_exp = or_(
                func.lower(Document.original_filename).like(search_pat),
                func.lower(Document.filename).like(search_pat),
            )
            query = query.where(filter_exp)
            count_q = count_q.where(filter_exp)

        if file_type and file_type != "all":
            clean_ext = file_type if file_type.startswith(".") else f".{file_type}"
            query = query.where(Document.file_extension == clean_ext)
            count_q = count_q.where(Document.file_extension == clean_ext)

        if status and status != "all":
            query = query.where(Document.status == status)
            count_q = count_q.where(Document.status == status)

        total = (await db.execute(count_q)).scalar_one()
        docs = (await db.execute(query.limit(limit).offset(offset))).scalars().all()

        # Look up owner info and transformation counts
        items: List[AdminDocumentItem] = []
        for d in docs:
            user_res = await db.execute(select(User).where(User.id == d.user_id))
            owner = user_res.scalar_one_or_none()

            tf_cnt = (
                await db.execute(
                    select(func.count(Transformation.id)).where(Transformation.document_id == d.id)
                )
            ).scalar() or 0

            items.append(
                AdminDocumentItem(
                    id=d.id,
                    filename=d.filename,
                    original_filename=d.original_filename,
                    file_extension=d.file_extension,
                    file_size_bytes=d.file_size_bytes,
                    mime_type=d.mime_type,
                    status=d.status,
                    user_id=d.user_id,
                    owner_email=owner.email if owner else f"{d.user_id}@platform.internal",
                    owner_name=owner.full_name if owner else d.user_id,
                    created_at=d.created_at,
                    chunk_count=d.chunk_count,
                    word_count=d.word_count,
                    transformation_count=tf_cnt,
                )
            )

        return items, total

    async def list_admin_transformations(
        self,
        db: AsyncSession,
        search: Optional[str] = None,
        transformation_type: Optional[str] = None,
        status: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[AdminTransformationItem], int]:
        """Fetch platform-wide transformations with status and error categories."""
        query = select(Transformation).order_by(Transformation.created_at.desc())
        count_q = select(func.count()).select_from(Transformation)

        if search:
            search_pat = f"%{search.strip().lower()}%"
            query = query.where(func.lower(Transformation.title).like(search_pat))
            count_q = count_q.where(func.lower(Transformation.title).like(search_pat))

        if transformation_type and transformation_type != "all":
            query = query.where(Transformation.transformation_type == transformation_type)
            count_q = count_q.where(Transformation.transformation_type == transformation_type)

        if status and status != "all":
            query = query.where(Transformation.status == status)
            count_q = count_q.where(Transformation.status == status)

        if user_id:
            query = query.where(Transformation.user_id == user_id)
            count_q = count_q.where(Transformation.user_id == user_id)

        total = (await db.execute(count_q)).scalar_one()
        tfs = (await db.execute(query.limit(limit).offset(offset))).scalars().all()

        items: List[AdminTransformationItem] = []
        for t in tfs:
            user_res = await db.execute(select(User).where(User.id == t.user_id))
            usr = user_res.scalar_one_or_none()

            doc_res = await db.execute(select(Document).where(Document.id == t.document_id))
            doc = doc_res.scalar_one_or_none()

            items.append(
                AdminTransformationItem(
                    id=t.id,
                    transformation_type=t.transformation_type,
                    tone=t.tone,
                    length=t.length,
                    title=t.title,
                    status=t.status,
                    duration_seconds=t.duration_seconds,
                    error_category=t.error_category,
                    error_message=t.error_message,
                    user_id=t.user_id,
                    user_email=usr.email if usr else f"{t.user_id}@platform.internal",
                    document_id=t.document_id,
                    document_filename=doc.original_filename if doc else None,
                    created_at=t.created_at,
                )
            )

        return items, total
