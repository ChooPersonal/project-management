import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, UserPlus } from 'lucide-react';
import { useCreateTeamMember } from '@/hooks/use-team-members';
import { toast } from '@/hooks/use-toast';

const addTeamMemberSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

type AddTeamMemberForm = z.infer<typeof addTeamMemberSchema>;

interface AddTeamMemberModalProps {
  trigger?: React.ReactNode;
}

export default function AddTeamMemberModal({ trigger }: AddTeamMemberModalProps) {
  const [open, setOpen] = useState(false);
  const createTeamMember = useCreateTeamMember();

  const form = useForm<AddTeamMemberForm>({
    resolver: zodResolver(addTeamMemberSchema),
    defaultValues: {
      fullName: '',
      email: '',
    },
  });

  const handleSubmit = async (data: AddTeamMemberForm) => {
    try {
      await createTeamMember.mutateAsync({
        ...data,
        username: data.email.split('@')[0], // Generate username from email
        password: 'temp_password_123', // Temporary password - should be changed on first login
        avatar: null,
        color: ['blue', 'emerald', 'purple', 'orange', 'pink', 'indigo'][Math.floor(Math.random() * 6)],
      });

      toast({
        title: "Team member added",
        description: `${data.fullName} has been added to the team.`,
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add team member. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter full name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTeamMember.isPending}
              >
                {createTeamMember.isPending ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}