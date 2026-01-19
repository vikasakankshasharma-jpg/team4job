import React from 'react';

interface DummyDataBadgeProps {
    isDummyData?: boolean;
    className?: string;
}

export const DummyDataBadge: React.FC<DummyDataBadgeProps> = ({ isDummyData, className = '' }) => {
    if (!isDummyData) return null;

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 ${className}`}
            title="This is generated dummy data for testing purposes"
        >
            Dummy Data
        </span>
    );
};
