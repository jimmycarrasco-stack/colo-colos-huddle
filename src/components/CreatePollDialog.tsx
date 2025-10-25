import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, X, Plus } from 'lucide-react';
import { z } from 'zod';

export const CreatePollDialog = () => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    try {
      // Validate
      const pollSchema = z.object({
        question: z.string().min(1, 'Question is required').max(200, 'Question too long'),
        options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required').max(10, 'Maximum 10 options'),
      });

      const validatedData = pollSchema.parse({
        question,
        options: options.filter(o => o.trim() !== '')
      });

      const { error } = await supabase
        .from('polls')
        .insert({
          question: validatedData.question,
          options: validatedData.options,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Poll created',
        description: 'Your poll has been shared with the team',
      });

      // Reset form
      setQuestion('');
      setOptions(['', '']);
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create poll',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <BarChart3 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Poll</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="What's your question?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label>Options</Label>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>
          <Button onClick={handleCreatePoll} className="w-full">
            Create Poll
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
