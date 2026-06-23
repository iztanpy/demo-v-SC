A few changes are needed for the part 1 demo:
1. We want to show multiple options with confidence scores
    1. Today, only one option is being shown
    2. Each of these option needs to have a rationale for why they were recommended
    3. We want to show that the choice has been captured after our user makes a choice

2. Before assigning the job to the technician
    1. A work order needs to be created, this will detail the initial diagnosis and checklist of steps to perform to complete the job
    2. Here, we also want to change from being dispatched to inspect to being dispatched to fix

3. During the execution, 
    1. we want a deviation from the workflow to be mentioned explicitly and shown to be logged by the system
    2. It is also crucial to show the diagnosis is revised, after analysing and finding new information
    3.  work order is re generated with the new diagnosis and new checklist.

4. After completion, 
    1. We want to show that a root cause analysis and report have been generated.