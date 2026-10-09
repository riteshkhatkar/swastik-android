from fastapi import APIRouter, Query, HTTPException
from app.controllers import report_controller
from typing import Optional

router = APIRouter(tags=["reports"])

VALID_REPORT_TYPES = [
    "daily-hospital",
    "lab-performance",
    "financial",
    "doctor-performance",
    "patient-statistics",
    "medication-monitoring",
]


@router.get("/download")
async def get_report_download(report_type: str = Query(..., description="Report type slug")):
    """Return real-time report data for the given report type (for PDF generation)."""
    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid report_type. Use one of: {VALID_REPORT_TYPES}")
    data = await report_controller.get_report_download_data(report_type)
    if data is None:
        raise HTTPException(status_code=404, detail="Report data not found")
    return data


@router.get("/analytics")
async def get_analytics(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    program_type: Optional[str] = Query(None)
):
    return await report_controller.get_report_analytics(
        from_date=from_date,
        to_date=to_date,
        doctor_id=doctor_id,
        program_type=program_type
    )
