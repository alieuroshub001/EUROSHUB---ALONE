import React from 'react';
import { Search, Grid3X3, List, Filter, TrendingUp } from 'lucide-react';
import { BoardFilters as BoardFiltersType, ViewMode, FilterType, SortOption } from '../types';

interface BoardFiltersProps {
  filters: BoardFiltersType;
  onFiltersChange: (filters: Partial<BoardFiltersType>) => void;
  boardCount: number;
  filteredCount: number;
}

const BoardFilters: React.FC<BoardFiltersProps> = ({
  filters,
  onFiltersChange,
  boardCount,
  filteredCount,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: e.target.value });
  };

  const handleFilterChange = (filter: FilterType) => {
    onFiltersChange({ filter });
  };

  const handleSortChange = (sort: SortOption) => {
    onFiltersChange({ sort });
  };

  const handleViewChange = (view: ViewMode) => {
    onFiltersChange({ view });
  };

  const filterOptions: Array<{ key: FilterType; label: string; count?: number }> = [
    { key: 'all', label: 'All Boards', count: boardCount },
    { key: 'starred', label: 'Starred' },
    { key: 'recent', label: 'Recent' },
    { key: 'archived', label: 'Archived' },
  ];

  const sortOptions: Array<{ key: SortOption; label: string }> = [
    { key: 'updated', label: 'Recently Updated' },
    { key: 'created', label: 'Recently Created' },
    { key: 'name', label: 'Alphabetical' },
    { key: 'activity', label: 'Most Active' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Boards
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filteredCount} of {boardCount} boards
            </p>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search boards..."
                value={filters.search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {filterOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => handleFilterChange(option.key)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  filters.filter === option.key
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                {option.label}
                {option.count !== undefined && filters.filter === option.key && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {option.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort and View Controls */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={filters.sort}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                {sortOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => handleViewChange('grid')}
                className={`p-2 rounded-md transition-all ${
                  filters.view === 'grid'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewChange('list')}
                className={`p-2 rounded-md transition-all ${
                  filters.view === 'list'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.search || filters.filter !== 'all') && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
            
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                Search: &quot;{filters.search}&quot;
                <button
                  onClick={() => onFiltersChange({ search: '' })}
                  className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 ml-1"
                >
                  ×
                </button>
              </span>
            )}
            
            {filters.filter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm rounded-full">
                Filter: {filterOptions.find(f => f.key === filters.filter)?.label}
                <button
                  onClick={() => onFiltersChange({ filter: 'all' })}
                  className="text-green-600 dark:text-green-300 hover:text-green-800 dark:hover:text-green-100 ml-1"
                >
                  ×
                </button>
              </span>
            )}
            
            <button
              onClick={() => onFiltersChange({ search: '', filter: 'all' })}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardFilters;