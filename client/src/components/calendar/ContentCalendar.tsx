'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Content } from '@/types';

interface CalendarDay {
  date: Date;
  content: Content[];
}

export function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarContent();
  }, [currentDate]);

  const fetchCalendarContent = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:9001/api/v1/content/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }
      );

      if (response.ok) {
        const data = await response.json();
        generateCalendarDays(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch calendar content:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (content: Content[]) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      const dayContent = content.filter((c) => {
        const contentDate = new Date(c.scheduledAt || c.publishedAt || c.createdAt);
        return (
          contentDate.getDate() === current.getDate() &&
          contentDate.getMonth() === current.getMonth() &&
          contentDate.getFullYear() === current.getFullYear()
        );
      });

      days.push({
        date: new Date(current),
        content: dayContent,
      });

      current.setDate(current.getDate() + 1);
    }

    setCalendarDays(days);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const pillarColors = {
    'internal-os': 'bg-blue-500',
    'psychology': 'bg-purple-500',
    'discipline': 'bg-red-500',
    'systems': 'bg-green-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Content Calendar</h1>
        <Button onClick={() => window.location.href = '/content/create'}>
          Create Content
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            {dayNames.map((day) => (
              <div
                key={day}
                className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.date.getMonth() === currentDate.getMonth();
              const isToday = 
                day.date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`
                    bg-white dark:bg-gray-900 p-2 min-h-[100px] cursor-pointer
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                    ${!isCurrentMonth ? 'opacity-50' : ''}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                  `}
                  onClick={() => setSelectedDay(day)}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {day.content.slice(0, 3).map((content) => (
                      <div
                        key={content.id}
                        className={`
                          h-1.5 rounded-full
                          ${pillarColors[content.pillar]}
                        `}
                        title={content.title}
                      />
                    ))}
                    {day.content.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{day.content.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle>
              Content for {selectedDay.date.toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDay.content.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No content scheduled for this day.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDay.content.map((content) => (
                  <div
                    key={content.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {content.title}
                      </h4>
                      <Badge>{content.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`w-3 h-3 rounded-full ${pillarColors[content.pillar]}`} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {content.pillar.replace('-', ' ').toUpperCase()}
                      </span>
                      {content.platform && (
                        <Badge variant="info">{content.platform}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}