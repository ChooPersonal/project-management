import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, getStatusColor, getPriorityColor } from '@/lib/utils';
import type { Project } from '@/types';

interface ProjectCalendarProps {
  projects: Project[];
}

interface CalendarProject extends Project {
  startDateParsed: Date | null;
  dueDateParsed: Date | null;
  isActive: boolean;
  isOverdue: boolean;
}

export default function ProjectCalendar({ projects }: ProjectCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Process projects with calendar data
  const calendarProjects: CalendarProject[] = projects
    .map(project => {
      const startDateParsed = project.startDate ? parseISO(project.startDate) : null;
      const dueDateParsed = project.dueDate ? parseISO(project.dueDate) : null;
      const today = new Date();
      
      const isActive = startDateParsed && dueDateParsed
        ? isWithinInterval(today, { start: startOfDay(startDateParsed), end: endOfDay(dueDateParsed) })
        : false;
      
      const isOverdue = dueDateParsed ? today > endOfDay(dueDateParsed) && project.status !== 'completed' : false;

      return {
        ...project,
        startDateParsed,
        dueDateParsed,
        isActive,
        isOverdue
      };
    })
    .filter(project => project.startDateParsed || project.dueDateParsed);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getProjectsForDay = (day: Date) => {
    return calendarProjects.filter(project => {
      if (!project.startDateParsed && !project.dueDateParsed) return false;
      
      // Check if project spans this day
      if (project.startDateParsed && project.dueDateParsed) {
        return isWithinInterval(day, {
          start: startOfDay(project.startDateParsed),
          end: endOfDay(project.dueDateParsed)
        });
      }
      
      // Check if project starts on this day
      if (project.startDateParsed && isSameDay(day, project.startDateParsed)) {
        return true;
      }
      
      // Check if project ends on this day
      if (project.dueDateParsed && isSameDay(day, project.dueDateParsed)) {
        return true;
      }
      
      return false;
    });
  };

  const getProjectDisplayType = (project: CalendarProject, day: Date) => {
    if (!project.startDateParsed || !project.dueDateParsed) return 'single';
    
    const isStart = isSameDay(day, project.startDateParsed);
    const isEnd = isSameDay(day, project.dueDateParsed);
    const isMiddle = isWithinInterval(day, {
      start: startOfDay(project.startDateParsed),
      end: endOfDay(project.dueDateParsed)
    }) && !isStart && !isEnd;
    
    if (isStart && isEnd) return 'single';
    if (isStart) return 'start';
    if (isEnd) return 'end';
    if (isMiddle) return 'middle';
    return 'single';
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
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
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {calendarDays.map(day => {
              const dayProjects = getProjectsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              
              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "min-h-[120px] p-2 border border-gray-200 bg-white",
                    !isCurrentMonth && "bg-gray-50 text-gray-400",
                    isTodayDate && "bg-blue-50 border-blue-200"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-2",
                    isTodayDate && "text-blue-600"
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayProjects.slice(0, 3).map(project => {
                      const displayType = getProjectDisplayType(project, day);
                      const isStart = displayType === 'start' || displayType === 'single';
                      const isEnd = displayType === 'end' || displayType === 'single';
                      const isMiddle = displayType === 'middle';
                      
                      return (
                        <div
                          key={`${project.id}-${day.toString()}`}
                          className={cn(
                            "text-xs p-1 rounded text-white truncate cursor-pointer transition-opacity hover:opacity-80",
                            project.isOverdue ? "bg-red-500" :
                            project.isActive ? "bg-green-500" :
                            project.status === 'completed' ? "bg-blue-500" :
                            project.priority === 'urgent' ? "bg-orange-500" :
                            project.priority === 'high' ? "bg-yellow-500" : "bg-gray-500",
                            isMiddle && "rounded-none",
                            isStart && !isEnd && "rounded-r-none",
                            isEnd && !isStart && "rounded-l-none"
                          )}
                          title={`${project.title} (${project.status})`}
                        >
                          {isStart ? project.title : ''}
                        </div>
                      );
                    })}
                    
                    {dayProjects.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{dayProjects.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-sm">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-sm">Urgent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span className="text-sm">Planned</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Summary for Current Month */}
      <Card>
        <CardHeader>
          <CardTitle>Projects in {format(currentDate, 'MMMM yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {calendarProjects
              .filter(project => {
                if (!project.startDateParsed && !project.dueDateParsed) return false;
                
                const projectSpansMonth = project.startDateParsed && project.dueDateParsed && (
                  isWithinInterval(monthStart, {
                    start: startOfDay(project.startDateParsed),
                    end: endOfDay(project.dueDateParsed)
                  }) ||
                  isWithinInterval(monthEnd, {
                    start: startOfDay(project.startDateParsed),
                    end: endOfDay(project.dueDateParsed)
                  }) ||
                  (project.startDateParsed <= monthStart && project.dueDateParsed >= monthEnd)
                );
                
                const projectStartsInMonth = project.startDateParsed && 
                  isSameMonth(project.startDateParsed, currentDate);
                
                const projectEndsInMonth = project.dueDateParsed && 
                  isSameMonth(project.dueDateParsed, currentDate);
                
                return projectSpansMonth || projectStartsInMonth || projectEndsInMonth;
              })
              .map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-3 h-3 rounded",
                        project.isOverdue ? "bg-red-500" :
                        project.isActive ? "bg-green-500" :
                        project.status === 'completed' ? "bg-blue-500" :
                        project.priority === 'urgent' ? "bg-orange-500" :
                        project.priority === 'high' ? "bg-yellow-500" : "bg-gray-500"
                      )}
                    />
                    <div>
                      <h4 className="font-medium">{project.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {project.startDateParsed && (
                          <span>Start: {format(project.startDateParsed, 'MMM dd')}</span>
                        )}
                        {project.startDateParsed && project.dueDateParsed && <span>•</span>}
                        {project.dueDateParsed && (
                          <span>End: {format(project.dueDateParsed, 'MMM dd')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(project.status))}>
                      {project.status}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(project.priority))}>
                      {project.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            
            {calendarProjects.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No projects with dates found for this month.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}