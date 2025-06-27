import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function DatePicker({ selectedDate, onDateSelect }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate);
  
  // Get month and year of the current view
  const month = currentMonth.getMonth();
  const year = currentMonth.getFullYear();
  
  // Get the month name
  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' });
  
  // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  // Get the number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Get the number of days in the previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  // Get today's date for highlighting
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const todayDate = today.getDate();
  
  // Calculate days to display from previous month
  const prevMonthDays = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }
  
  // Calculate days to display for the current month
  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(i);
  }
  
  // Calculate days to display from next month
  const nextMonthDays = [];
  const totalDaysDisplayed = prevMonthDays.length + currentMonthDays.length;
  const remainingCells = 42 - totalDaysDisplayed; // 6 rows x 7 days
  for (let i = 1; i <= remainingCells; i++) {
    nextMonthDays.push(i);
  }
  
  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };
  
  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };
  
  // Select a date
  const selectDate = (day: number, isCurrentMonth: boolean) => {
    let newDate;
    if (isCurrentMonth) {
      newDate = new Date(year, month, day);
    } else if (day > 20) {
      // Previous month (if day is large, it's from the previous month)
      newDate = new Date(year, month - 1, day);
    } else {
      // Next month (if day is small, it's from the next month)
      newDate = new Date(year, month + 1, day);
    }
    onDateSelect(newDate);
    setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
  };
  
  // Check if a date has appointments (this would be replaced with actual logic)
  const hasAppointments = (day: number): boolean => {
    // This is just a placeholder, you would check against real data
    return [3, 5, 12, 20].includes(day);
  };
  
  // Check if a date is the selected date
  const isSelectedDate = (day: number, isCurrentMonth: boolean): boolean => {
    if (!isCurrentMonth) return false;
    return selectedDate.getDate() === day && 
           selectedDate.getMonth() === month && 
           selectedDate.getFullYear() === year;
  };
  
  // Generate weekday headers
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={prevMonth}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold text-lg">
          {monthName} {year}
        </h2>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={nextMonth}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday headers */}
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-slate-500 font-medium py-1">
            {day}
          </div>
        ))}
        
        {/* Previous month days */}
        {prevMonthDays.map(day => (
          <div key={`prev-${day}`} className="aspect-square flex items-center justify-center">
            <button 
              className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 text-sm"
              onClick={() => selectDate(day, false)}
            >
              {day}
            </button>
          </div>
        ))}
        
        {/* Current month days */}
        {currentMonthDays.map(day => (
          <div key={`current-${day}`} className="aspect-square flex items-center justify-center">
            <button 
              className={`w-8 h-8 rounded-full text-sm relative
                ${isSelectedDate(day, true) 
                  ? "bg-primary-500 text-white font-medium hover:bg-primary-600" 
                  : isCurrentMonth && day === todayDate
                    ? "bg-primary-50 text-primary-700 font-medium hover:bg-primary-100"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              onClick={() => selectDate(day, true)}
            >
              {day}
              {hasAppointments(day) && !isSelectedDate(day, true) && (
                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full"></span>
              )}
            </button>
          </div>
        ))}
        
        {/* Next month days */}
        {nextMonthDays.map(day => (
          <div key={`next-${day}`} className="aspect-square flex items-center justify-center">
            <button 
              className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 text-sm"
              onClick={() => selectDate(day, false)}
            >
              {day}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
