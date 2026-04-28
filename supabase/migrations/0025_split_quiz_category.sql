-- Move templates that are actually quizzes into the new 'Quiz' category
update templates 
set category = 'Quiz' 
where category = 'Classroom' 
  and ('quiz' = any(tags) or 'kahoot' = any(tags));
