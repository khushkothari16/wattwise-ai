"""
APScheduler — daily auto-log job at midnight.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger


scheduler = BackgroundScheduler()


def start_scheduler(app):
    from app.core.database import SessionLocal
    from app.services.consumption_engine import log_daily_consumption
    from app.services.anomaly_detector import detect_anomalies

    def daily_job():
        db = SessionLocal()
        try:
            logs = log_daily_consumption(db)
            detect_anomalies(db)
            print(f"[Scheduler] Daily job: logged {len(logs)} entries")
        except Exception as e:
            print(f"[Scheduler] Error: {e}")
        finally:
            db.close()

    scheduler.add_job(daily_job, CronTrigger(hour=0, minute=1))
    scheduler.start()
    print("[Scheduler] Started — daily log at 00:01")
