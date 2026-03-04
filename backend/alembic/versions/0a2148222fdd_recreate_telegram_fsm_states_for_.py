"""Recreate telegram_fsm_states table for webhook/NeonStorage mode

Revision ID: 0a2148222fdd
Revises: 06a45999a9b5
Create Date: 2026-03-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0a2148222fdd'
down_revision: Union[str, None] = '06a45999a9b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Recreate the telegram_fsm_states table (was dropped in 06a45999a9b5)
    # Needed for NeonStorage / webhook mode so FSM state persists across
    # serverless function invocations on Vercel.
    # Using IF NOT EXISTS because local DBs may never have lost this table.
    op.execute("""
        CREATE TABLE IF NOT EXISTS telegram_fsm_states (
            key         VARCHAR(255) NOT NULL,
            state       VARCHAR(255),
            data        TEXT,
            updated_at  TIMESTAMP WITH TIME ZONE,
            CONSTRAINT telegram_fsm_states_pkey PRIMARY KEY (key)
        )
    """)


def downgrade() -> None:
    op.drop_table('telegram_fsm_states')
